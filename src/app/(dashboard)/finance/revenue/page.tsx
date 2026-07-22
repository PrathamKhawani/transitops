"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/AppHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Trip {
  id: string;
  tripCode: string;
  source: string;
  destination: string;
  cargoWeight: number;
  actualDistance: number | null;
  fuelConsumed: number | null;
  revenue: number;
  completedAt: string | null;
  vehicle: { name: string } | null;
  driver: { name: string } | null;
}

export default function RevenuePage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trips?status=COMPLETED");
      const data = await res.json();
      setTrips(Array.isArray(data) ? data : []);
    } catch {
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const totalRevenue = trips.reduce((s, t) => s + (t.revenue || 0), 0);
  const avgRevenue = trips.length > 0 ? totalRevenue / trips.length : 0;
  const maxRevenue = trips.length > 0 ? Math.max(...trips.map(t => t.revenue || 0)) : 0;

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: "tripCode", label: "Trip Code", sortable: true,
      render: (v) => (
        <span className="font-mono text-xs" style={{ color: "#475569" }}>
          {String(v ?? "—")}
        </span>
      ),
    },
    {
      key: "source", label: "Route",
      render: (_v, row) => `${row.source ?? "—"} → ${row.destination ?? "—"}`,
    },
    {
      key: "vehicle", label: "Vehicle",
      render: (v) => (v as { name?: string })?.name ?? "—",
    },
    {
      key: "driver", label: "Driver",
      render: (v) => (v as { name?: string })?.name ?? "—",
    },
    {
      key: "cargoWeight", label: "Cargo", sortable: true,
      render: (v) => v != null ? `${v}T` : "—",
    },
    {
      key: "actualDistance", label: "Distance", sortable: true,
      render: (v) => v != null ? `${v} km` : "—",
    },
    {
      key: "fuelConsumed", label: "Fuel", sortable: true,
      render: (v) => v != null ? `${v}L` : "—",
    },
    {
      key: "revenue", label: "Revenue", sortable: true,
      render: (v) => (
        <span className="font-semibold" style={{ color: "#16a34a" }}>
          {formatCurrency((v as number) ?? 0)}
        </span>
      ),
    },
    {
      key: "completedAt", label: "Completed", sortable: true,
      render: (v) => formatDate(v as string),
    },
  ];

  return (
    <div style={{ padding: "36px 44px" }}>
      <PageHeader
        title="Revenue Tracking"
        description="Revenue generated from all completed trips"
        breadcrumb="Financial Analyst"
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
        <div className="card" style={{ padding: "18px 20px", borderLeft: "3px solid #10B981" }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Total Revenue
          </p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#18181B", letterSpacing: "-0.03em", lineHeight: 1 }}>
            {loading ? "—" : formatCurrency(totalRevenue)}
          </p>
          <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>
            {loading ? "Loading..." : `${trips.length} completed trips`}
          </p>
        </div>
        <div className="card" style={{ padding: "18px 20px", borderLeft: "3px solid #3B82F6" }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Avg Per Trip
          </p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#18181B", letterSpacing: "-0.03em", lineHeight: 1 }}>
            {loading ? "—" : formatCurrency(avgRevenue)}
          </p>
          <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>Revenue per trip</p>
        </div>
        <div className="card" style={{ padding: "18px 20px", borderLeft: "3px solid #F59E0B" }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Highest Trip
          </p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#18181B", letterSpacing: "-0.03em", lineHeight: 1 }}>
            {loading ? "—" : formatCurrency(maxRevenue)}
          </p>
          <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>Best single trip</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={trips as unknown as Record<string, unknown>[]}
        loading={loading}
        searchPlaceholder="Search by trip code, source, or destination..."
        searchKeys={["tripCode", "source", "destination"]}
      />
    </div>
  );
}
