import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

function esc(v: unknown): string {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSV(headers: string[], rows: unknown[][]): string {
  return [headers.join(","), ...rows.map(r => r.map(esc).join(","))].join("\n");
}

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "FINANCIAL_ANALYST") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "fleet";
  const vehicleId = searchParams.get("vehicleId") || undefined;
  const region = searchParams.get("region") || undefined;
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  type DateFilter = { gte?: Date; lte?: Date };
  const buildDate = (key: string): DateFilter | undefined => {
    const f: DateFilter = {};
    if (dateFrom) f.gte = new Date(dateFrom);
    if (dateTo) { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); f.lte = d; }
    return Object.keys(f).length ? f : undefined;
  };
  const df = buildDate("date");
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  let csv = "";
  let filename = "report.csv";

  // ── Fleet Performance ───────────────────────────────────────────────────────
  if (type === "fleet") {
    const where: Record<string, unknown> = {};
    if (vehicleId) where.id = vehicleId;
    if (region) where.region = region;

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        trips: {
          where: { status: "COMPLETED", ...(df ? { completedAt: df } : {}) },
          select: { revenue: true, actualDistance: true, fuelConsumed: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const headers = ["Vehicle", "Registration No.", "Type", "Region", "Status", "Odometer (km)", "Trips Completed", "Total Distance (km)", "Total Revenue (₹)", "Acquisition Cost (₹)"];
    const rows = vehicles.map(v => [
      v.name, v.registrationNumber, v.type, v.region, v.status, v.odometer,
      v.trips.length,
      v.trips.reduce((s, t) => s + (t.actualDistance ?? 0), 0).toFixed(1),
      v.trips.reduce((s, t) => s + t.revenue, 0).toFixed(0),
      v.acquisitionCost.toFixed(0),
    ]);
    csv = toCSV(headers, rows);
    filename = "fleet_performance_report.csv";
  }

  // ── Fuel Efficiency ─────────────────────────────────────────────────────────
  else if (type === "fuel") {
    const where: Record<string, unknown> = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (df) where.date = df;

    const logs = await prisma.fuelLog.findMany({
      where,
      include: {
        vehicle: { select: { name: true, registrationNumber: true, region: true } },
        trip: { select: { tripCode: true, actualDistance: true } },
      },
      orderBy: { date: "desc" },
    });

    const headers = ["Date", "Vehicle", "Registration", "Region", "Trip", "Litres", "Cost (₹)", "Odometer (km)", "Fuel Efficiency (km/L)"];
    const rows = logs.map(l => {
      const dist = l.trip?.actualDistance;
      const eff = dist && l.liters > 0 ? (dist / l.liters).toFixed(2) : "—";
      return [fmt(new Date(l.date)), l.vehicle.name, l.vehicle.registrationNumber, l.vehicle.region,
        l.trip?.tripCode ?? "—", l.liters, l.cost.toFixed(0), l.odometerReading, eff];
    });
    csv = toCSV(headers, rows);
    filename = "fuel_efficiency_report.csv";
  }

  // ── Operational Cost ────────────────────────────────────────────────────────
  else if (type === "cost") {
    const where: Record<string, unknown> = {};
    if (vehicleId) where.id = vehicleId;
    if (region) where.region = region;

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        fuelLogs: { where: df ? { date: df } : {}, select: { cost: true } },
        maintenanceLogs: { where: df ? { startDate: df } : {}, select: { cost: true } },
        expenses: { where: df ? { date: df } : {}, select: { amount: true, type: true } },
      },
      orderBy: { name: "asc" },
    });

    const headers = ["Vehicle", "Registration", "Type", "Region", "Fuel Cost (₹)", "Maintenance Cost (₹)", "Other Expenses (₹)", "Total Cost (₹)"];
    const rows = vehicles.map(v => {
      const fuelCost = v.fuelLogs.reduce((s, f) => s + f.cost, 0);
      const maintCost = v.maintenanceLogs.reduce((s, m) => s + m.cost, 0)
        + v.expenses.filter(e => e.type === "Maintenance").reduce((s, e) => s + e.amount, 0);
      const other = v.expenses.filter(e => e.type !== "Maintenance").reduce((s, e) => s + e.amount, 0);
      return [v.name, v.registrationNumber, v.type, v.region,
        fuelCost.toFixed(0), maintCost.toFixed(0), other.toFixed(0), (fuelCost + maintCost + other).toFixed(0)];
    });
    csv = toCSV(headers, rows);
    filename = "operational_cost_report.csv";
  }

  // ── Vehicle ROI ─────────────────────────────────────────────────────────────
  else if (type === "roi") {
    const where: Record<string, unknown> = {};
    if (vehicleId) where.id = vehicleId;
    if (region) where.region = region;

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        trips: { where: { status: "COMPLETED", ...(df ? { completedAt: df } : {}) }, select: { revenue: true } },
        fuelLogs: { where: df ? { date: df } : {}, select: { cost: true } },
        maintenanceLogs: { where: df ? { startDate: df } : {}, select: { cost: true } },
      },
      orderBy: { name: "asc" },
    });

    const headers = ["Vehicle", "Registration", "Type", "Region", "Acquisition Cost (₹)", "Revenue (₹)", "Maintenance Cost (₹)", "Fuel Cost (₹)", "Net Contribution (₹)", "ROI (%)"];
    const rows = vehicles.map(v => {
      const revenue = v.trips.reduce((s, t) => s + t.revenue, 0);
      const maintCost = v.maintenanceLogs.reduce((s, m) => s + m.cost, 0);
      const fuelCost = v.fuelLogs.reduce((s, f) => s + f.cost, 0);
      const net = revenue - maintCost - fuelCost;
      const roi = v.acquisitionCost > 0 ? (net / v.acquisitionCost) * 100 : 0;
      return [v.name, v.registrationNumber, v.type, v.region,
        v.acquisitionCost.toFixed(0), revenue.toFixed(0), maintCost.toFixed(0),
        fuelCost.toFixed(0), net.toFixed(0), roi.toFixed(2)];
    });
    csv = toCSV(headers, rows);
    filename = "vehicle_roi_report.csv";
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
