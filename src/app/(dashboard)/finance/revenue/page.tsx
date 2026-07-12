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
    <div className="p-6">
      <PageHeader title="Revenue Tracking" description="Revenue from all completed trips" breadcrumb="Financial Analyst" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4" style={{ border: "1px solid #e2e8f0", borderTop: "3px solid #22c55e" }}>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#64748b" }}>Total Revenue</p>
          <p className="text-xl font-bold mt-1" style={{ color: "#0f172a" }}>{formatCurrency(totalRevenue)}</p>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>{trips.length} completed trips</p>
        </div>
        <div className="bg-white rounded-xl p-4" style={{ border: "1px solid #e2e8f0" }}>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#64748b" }}>Avg Per Trip</p>
          <p className="text-xl font-bold mt-1" style={{ color: "#0f172a" }}>{formatCurrency(avgRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl p-4" style={{ border: "1px solid #e2e8f0" }}>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#64748b" }}>Highest Trip</p>
          <p className="text-xl font-bold mt-1" style={{ color: "#0f172a" }}>{formatCurrency(maxRevenue)}</p>
        </div>
      </div>

      <DataTable columns={columns} data={trips as unknown as Record<string, unknown>[]} searchPlaceholder="Search trips..." />
    </div>
  );
}
