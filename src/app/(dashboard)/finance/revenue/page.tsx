import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/AppHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function RevenuePage() {
  const session = await requireAuth();
  if (!session || session.role !== "FINANCIAL_ANALYST") redirect("/login");

  const trips = await prisma.trip.findMany({
    where: { status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    include: {
      vehicle: { select: { name: true } },
      driver: { select: { name: true } },
    },
  });

  const totalRevenue = trips.reduce((s, t) => s + t.revenue, 0);
  const avgRevenue = trips.length > 0 ? totalRevenue / trips.length : 0;
  const maxRevenue = trips.length > 0 ? Math.max(...trips.map(t => t.revenue)) : 0;

  const columns = [
    { key: "tripCode", label: "Trip Code", render: (v: unknown) => <span className="font-mono text-xs" style={{ color: "#475569" }}>{v as string}</span> },
    { key: "source", label: "Route", render: (_: unknown, row: Record<string, unknown>) => `${row.source} → ${row.destination}` },
    { key: "vehicle", label: "Vehicle", render: (v: unknown) => (v as {name:string}).name },
    { key: "driver", label: "Driver", render: (v: unknown) => (v as {name:string}).name },
    { key: "cargoWeight", label: "Cargo", render: (v: unknown) => `${v}T` },
    { key: "actualDistance", label: "Distance", render: (v: unknown) => v ? `${v} km` : "—" },
    { key: "fuelConsumed", label: "Fuel", render: (v: unknown) => v ? `${v}L` : "—" },
    { key: "revenue", label: "Revenue", sortable: true, render: (v: unknown) => <span className="font-semibold" style={{ color: "#16a34a" }}>{formatCurrency(v as number)}</span> },
    { key: "completedAt", label: "Completed", render: (v: unknown) => formatDate(v as string) },
  ];

  return (
    <div style={{ padding: "36px 44px" }}>
      <PageHeader title="Revenue Tracking" description="Revenue generated from all completed trips" breadcrumb="Financial Analyst" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
        <div className="card" style={{ padding: "18px 20px", borderLeft: "3px solid #10B981" }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Total Revenue</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#18181B", letterSpacing: "-0.03em", lineHeight: 1 }}>{formatCurrency(totalRevenue)}</p>
          <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>{trips.length} completed trips</p>
        </div>
        <div className="card" style={{ padding: "18px 20px", borderLeft: "3px solid #3B82F6" }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Avg Per Trip</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#18181B", letterSpacing: "-0.03em", lineHeight: 1 }}>{formatCurrency(avgRevenue)}</p>
          <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>Revenue per trip</p>
        </div>
        <div className="card" style={{ padding: "18px 20px", borderLeft: "3px solid #F59E0B" }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Highest Trip</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#18181B", letterSpacing: "-0.03em", lineHeight: 1 }}>{formatCurrency(maxRevenue)}</p>
          <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>Best single trip</p>
        </div>
      </div>

      <DataTable columns={columns} data={trips as unknown as Record<string, unknown>[]} searchPlaceholder="Search trips..." />
    </div>
  );
}
