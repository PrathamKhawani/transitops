import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/AppHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { FinanceCharts } from "@/components/shared/FinanceCharts";
import { DollarSign, Fuel, Wrench, Receipt, TrendingDown, TrendingUp, ArrowUpDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Vehicle profitability sortable table (client interaction via query params)
function VehicleProfitabilityTable({
  data,
}: {
  data: Array<{
    id: string; name: string; registrationNumber: string; type: string; region: string;
    revenue: number; fuelCost: number; maintenanceCost: number; otherExpenses: number;
    totalCost: number; netContribution: number; roi: number;
  }>;
}) {
  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #f1f5f9" }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Vehicle Profitability</p>
          <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>(Revenue − (Maintenance + Fuel)) / Acquisition Cost × 100</p>
        </div>
        <ArrowUpDown className="w-4 h-4" style={{ color: "#94a3b8" }} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
              {["Vehicle", "Revenue", "Fuel Cost", "Maintenance", "Other Exp.", "Total Cost", "Net Contribution", "ROI"].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((v, i) => (
              <tr key={v.id} style={{ borderBottom: i < data.length - 1 ? "1px solid #f8fafc" : "none" }}>
                <td className="px-4 py-3">
                  <p className="font-medium" style={{ color: "#0f172a" }}>{v.name}</p>
                  <p style={{ color: "#94a3b8" }}>{v.registrationNumber} · {v.type}</p>
                </td>
                <td className="px-4 py-3 font-medium" style={{ color: "#16a34a" }}>{formatCurrency(v.revenue)}</td>
                <td className="px-4 py-3" style={{ color: "#f97316" }}>{formatCurrency(v.fuelCost)}</td>
                <td className="px-4 py-3" style={{ color: "#f59e0b" }}>{formatCurrency(v.maintenanceCost)}</td>
                <td className="px-4 py-3" style={{ color: "#64748b" }}>{formatCurrency(v.otherExpenses)}</td>
                <td className="px-4 py-3" style={{ color: "#dc2626" }}>{formatCurrency(v.totalCost)}</td>
                <td className="px-4 py-3 font-semibold" style={{ color: v.netContribution >= 0 ? "#16a34a" : "#dc2626" }}>
                  {formatCurrency(v.netContribution)}
                </td>
                <td className="px-4 py-3">
                  <span className="font-bold px-2 py-0.5 rounded text-xs" style={{
                    background: v.roi >= 5 ? "#f0fdf4" : v.roi >= 0 ? "#fffbeb" : "#fef2f2",
                    color: v.roi >= 5 ? "#16a34a" : v.roi >= 0 ? "#d97706" : "#dc2626",
                  }}>
                    {v.roi}%
                  </span>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center" style={{ color: "#94a3b8" }}>No data available</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const session = await requireAuth();
  if (!session || session.role !== "FINANCIAL_ANALYST") redirect("/login");

  // Fetch all data directly from DB (server component)
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

  // Monthly chart data (last 12 months)
  const now = new Date();
  const monthKeys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const monthlyRaw: Record<string, { revenue: number; fuelCost: number }> = {};
  monthKeys.forEach(k => (monthlyRaw[k] = { revenue: 0, fuelCost: 0 }));
  completedTrips.forEach(t => {
    if (t.completedAt) {
      const d = new Date(t.completedAt);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (k in monthlyRaw) monthlyRaw[k].revenue += t.revenue;
    }
  });
  fuelLogs.forEach(f => {
    const d = new Date(f.date);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (k in monthlyRaw) monthlyRaw[k].fuelCost += f.cost;
  });
  const monthlyChartData = monthKeys.map(k => ({
    month: k.substring(5) + "/" + k.substring(2, 4),
    revenue: Math.round(monthlyRaw[k].revenue),
    fuelCost: Math.round(monthlyRaw[k].fuelCost),
  }));

  // Fleet status
  const fleetStatus = ["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"].map(s => ({
    status: s,
    count: vehicleGroups.find(g => g.status === s)?._count.id ?? 0,
  }));

  // Vehicle profitability
  type VData = { name: string; registrationNumber: string; type: string; region: string; acquisitionCost: number; revenue: number; fuelCost: number; maintenanceCost: number; otherExpenses: number };
  const vm = new Map<string, VData>();
  vehicles.forEach(v => vm.set(v.id, { name: v.name, registrationNumber: v.registrationNumber, type: v.type, region: v.region, acquisitionCost: v.acquisitionCost, revenue: 0, fuelCost: 0, maintenanceCost: 0, otherExpenses: 0 }));
  completedTrips.forEach(t => { const d = vm.get(t.vehicleId); if (d) d.revenue += t.revenue; });
  fuelLogs.forEach(f => { const d = vm.get(f.vehicleId); if (d) d.fuelCost += f.cost; });
  maintenanceLogs.forEach(m => { const d = vm.get(m.vehicleId); if (d) d.maintenanceCost += m.cost; });
  expenses.forEach(e => {
    if (e.vehicleId) {
      const d = vm.get(e.vehicleId);
      if (d) { if (e.type === "Maintenance") d.maintenanceCost += e.amount; else d.otherExpenses += e.amount; }
    }
  });
  const vehicleProfitability = Array.from(vm.entries()).map(([id, data]) => {
    const totalCost = data.fuelCost + data.maintenanceCost + data.otherExpenses;
    const netContribution = data.revenue - totalCost;
    const roi = data.acquisitionCost > 0 ? ((data.revenue - data.maintenanceCost - data.fuelCost) / data.acquisitionCost) * 100 : 0;
    return { id, ...data, totalCost: Math.round(totalCost), netContribution: Math.round(netContribution), roi: Math.round(roi * 10) / 10, revenue: Math.round(data.revenue), fuelCost: Math.round(data.fuelCost), maintenanceCost: Math.round(data.maintenanceCost), otherExpenses: Math.round(data.otherExpenses), acquisitionCost: Math.round(data.acquisitionCost) };
  }).sort((a, b) => b.roi - a.roi);

  const short = (name: string) => name.replace(/ \d+$/, "").substring(0, 14);
  const fuelByVehicle = [...vehicleProfitability].filter(v => v.fuelCost > 0).sort((a, b) => b.fuelCost - a.fuelCost).slice(0, 8).map(v => ({ name: short(v.name), fuelCost: v.fuelCost }));
  const maintenanceByVehicle = [...vehicleProfitability].filter(v => v.maintenanceCost > 0).sort((a, b) => b.maintenanceCost - a.maintenanceCost).slice(0, 8).map(v => ({ name: short(v.name), maintenanceCost: v.maintenanceCost }));
  const topCostliest = [...vehicleProfitability].sort((a, b) => b.totalCost - a.totalCost).slice(0, 6).map(v => ({ name: v.name.substring(0, 14), totalCost: v.totalCost, fuelCost: v.fuelCost, maintenanceCost: v.maintenanceCost }));

  // Top-level KPIs
  const totalRevenue = completedTrips.reduce((s, t) => s + t.revenue, 0);
  const totalFuelCost = fuelLogs.reduce((s, f) => s + f.cost, 0);
  const totalMaintCost = maintenanceLogs.reduce((s, m) => s + m.cost, 0);
  const totalOtherExp = expenses.filter(e => e.type !== "Maintenance").reduce((s, e) => s + e.amount, 0);
  const totalCost = totalFuelCost + totalMaintCost + totalOtherExp;
  const netContribution = totalRevenue - totalCost;

  // Fleet Utilization = ON_TRIP / non-retired
  const nonRetired = fleetStatus.filter(s => s.status !== "RETIRED").reduce((s, f) => s + f.count, 0);
  const onTrip = fleetStatus.find(s => s.status === "ON_TRIP")?.count ?? 0;
  const fleetUtilization = nonRetired > 0 ? Math.round((onTrip / nonRetired) * 100) : 0;

  // Fuel efficiency (km/L) from completed trips
  const totalDist = completedTrips.reduce((s, t) => s + (t.actualDistance ?? 0), 0);
  const totalFuel = completedTrips.reduce((s, t) => s + (t.fuelConsumed ?? 0), 0);
  const avgFuelEff = totalFuel > 0 ? Math.round((totalDist / totalFuel) * 10) / 10 : null;

  return (
    <div className="p-6">
      <PageHeader title="Finance Analytics" description="Vehicle profitability, fleet economics, and cost breakdowns — all from real DB data" breadcrumb="Financial Analyst" />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Total Revenue" value={formatCurrency(totalRevenue)} subtitle={`${completedTrips.length} trips`} icon={DollarSign} iconColor="#16a34a" iconBg="#f0fdf4" accent="#22c55e" />
        <KpiCard title="Fuel Cost" value={formatCurrency(totalFuelCost)} subtitle={avgFuelEff ? `${avgFuelEff} km/L avg` : "No trips"} icon={Fuel} iconColor="#ea580c" iconBg="#fff7ed" accent="#f97316" />
        <KpiCard title="Maintenance Cost" value={formatCurrency(totalMaintCost)} subtitle="Completed work orders" icon={Wrench} iconColor="#b45309" iconBg="#fffbeb" accent="#f59e0b" />
        <KpiCard title="Other Expenses" value={formatCurrency(totalOtherExp)} subtitle="Toll, labour, admin" icon={Receipt} iconColor="#7c3aed" iconBg="#faf5ff" accent="#8b5cf6" />
        <KpiCard title="Total Cost" value={formatCurrency(totalCost)} subtitle="All expenditures" icon={TrendingDown} iconColor="#dc2626" iconBg="#fef2f2" accent="#ef4444" />
        <KpiCard title="Net Contribution" value={formatCurrency(netContribution)} subtitle={netContribution >= 0 ? "Surplus" : "Deficit"} icon={netContribution >= 0 ? TrendingUp : TrendingDown} iconColor={netContribution >= 0 ? "#16a34a" : "#dc2626"} iconBg={netContribution >= 0 ? "#f0fdf4" : "#fef2f2"} accent={netContribution >= 0 ? "#22c55e" : "#ef4444"} />
        <KpiCard title="Fleet Utilization" value={`${fleetUtilization}%`} subtitle={`${onTrip} of ${nonRetired} active vehicles`} icon={TrendingUp} iconColor="#2563eb" iconBg="#eff6ff" accent="#2563eb" />
        <KpiCard title="Fuel Efficiency" value={avgFuelEff ? `${avgFuelEff} km/L` : "—"} subtitle="Fleet average" icon={Fuel} iconColor="#0891b2" iconBg="#ecfeff" accent="#06b6d4" />
      </div>

      {/* Charts */}
      <div className="mb-6">
        <FinanceCharts
          monthlyChartData={monthlyChartData}
          fleetStatus={fleetStatus}
          fuelByVehicle={fuelByVehicle}
          maintenanceByVehicle={maintenanceByVehicle}
          topCostliest={topCostliest}
        />
      </div>

      {/* Vehicle Profitability Table */}
      <VehicleProfitabilityTable data={vehicleProfitability} />
    </div>
  );
}
