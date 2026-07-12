import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "FINANCIAL_ANALYST") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const [vehicles, vehicleGroups, completedTrips, fuelLogs, maintenanceLogs, expenses] = await Promise.all([
    prisma.vehicle.findMany({
      select: { id: true, name: true, registrationNumber: true, type: true, region: true, status: true, acquisitionCost: true },
    }),
    prisma.vehicle.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.trip.findMany({
      where: { status: "COMPLETED" },
      select: { vehicleId: true, revenue: true, actualDistance: true, fuelConsumed: true, completedAt: true },
    }),
    prisma.fuelLog.findMany({ select: { vehicleId: true, cost: true, liters: true, date: true } }),
    prisma.maintenanceLog.findMany({ select: { vehicleId: true, cost: true, status: true } }),
    prisma.expense.findMany({ select: { vehicleId: true, amount: true, type: true, date: true } }),
  ]);

  // ── Monthly chart data (last 12 months) ──────────────────────────────────
  const now = new Date();
  const monthKeys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const monthlyData: Record<string, { revenue: number; fuelCost: number }> = {};
  monthKeys.forEach(k => (monthlyData[k] = { revenue: 0, fuelCost: 0 }));

  completedTrips.forEach(t => {
    if (t.completedAt) {
      const d = new Date(t.completedAt);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (k in monthlyData) monthlyData[k].revenue += t.revenue;
    }
  });

  fuelLogs.forEach(f => {
    const d = new Date(f.date);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (k in monthlyData) monthlyData[k].fuelCost += f.cost;
  });

  const monthlyChartData = monthKeys.map(k => {
    const [year, month] = k.split("-");
    return {
      month: `${month}/${year.slice(2)}`,
      revenue: Math.round(monthlyData[k].revenue),
      fuelCost: Math.round(monthlyData[k].fuelCost),
    };
  });

  // ── Fleet Status pie ──────────────────────────────────────────────────────
  const fleetStatus = ["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"].map(s => ({
    status: s,
    count: vehicleGroups.find(g => g.status === s)?._count.id ?? 0,
  }));

  // ── Vehicle profitability ─────────────────────────────────────────────────
  type VData = {
    name: string; registrationNumber: string; type: string; region: string;
    acquisitionCost: number; revenue: number; fuelCost: number; maintenanceCost: number; otherExpenses: number;
  };
  const vm = new Map<string, VData>();
  vehicles.forEach(v =>
    vm.set(v.id, {
      name: v.name, registrationNumber: v.registrationNumber,
      type: v.type, region: v.region, acquisitionCost: v.acquisitionCost,
      revenue: 0, fuelCost: 0, maintenanceCost: 0, otherExpenses: 0,
    })
  );

  completedTrips.forEach(t => { const d = vm.get(t.vehicleId); if (d) d.revenue += t.revenue; });
  fuelLogs.forEach(f => { const d = vm.get(f.vehicleId); if (d) d.fuelCost += f.cost; });
  maintenanceLogs.forEach(m => { const d = vm.get(m.vehicleId); if (d) d.maintenanceCost += m.cost; });
  expenses.forEach(e => {
    if (e.vehicleId) {
      const d = vm.get(e.vehicleId);
      if (d) {
        if (e.type === "Maintenance") d.maintenanceCost += e.amount;
        else d.otherExpenses += e.amount;
      }
    }
  });

  const vehicleProfitability = Array.from(vm.entries()).map(([id, data]) => {
    const totalCost = data.fuelCost + data.maintenanceCost + data.otherExpenses;
    const netContribution = data.revenue - totalCost;
    // ROI = (Revenue - Maintenance - Fuel) / AcquisitionCost × 100
    const roi = data.acquisitionCost > 0
      ? ((data.revenue - data.maintenanceCost - data.fuelCost) / data.acquisitionCost) * 100
      : 0;
    return {
      id,
      name: data.name, registrationNumber: data.registrationNumber, type: data.type, region: data.region,
      acquisitionCost: Math.round(data.acquisitionCost),
      revenue: Math.round(data.revenue),
      fuelCost: Math.round(data.fuelCost),
      maintenanceCost: Math.round(data.maintenanceCost),
      otherExpenses: Math.round(data.otherExpenses),
      totalCost: Math.round(totalCost),
      netContribution: Math.round(netContribution),
      roi: Math.round(roi * 10) / 10,
    };
  });

  const short = (name: string) => name.replace(/ \d+$/, "").substring(0, 14);

  const fuelByVehicle = [...vehicleProfitability]
    .filter(v => v.fuelCost > 0)
    .sort((a, b) => b.fuelCost - a.fuelCost)
    .slice(0, 8)
    .map(v => ({ name: short(v.name), fuelCost: v.fuelCost }));

  const maintenanceByVehicle = [...vehicleProfitability]
    .filter(v => v.maintenanceCost > 0)
    .sort((a, b) => b.maintenanceCost - a.maintenanceCost)
    .slice(0, 8)
    .map(v => ({ name: short(v.name), maintenanceCost: v.maintenanceCost }));

  const topCostliest = [...vehicleProfitability]
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 6)
    .map(v => ({ name: v.name.substring(0, 14), totalCost: v.totalCost, fuelCost: v.fuelCost, maintenanceCost: v.maintenanceCost }));

  return NextResponse.json({
    monthlyChartData,
    fleetStatus,
    vehicleProfitability: vehicleProfitability.sort((a, b) => b.roi - a.roi),
    fuelByVehicle,
    maintenanceByVehicle,
    topCostliest,
  });
}
