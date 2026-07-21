"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/AppHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatNumber } from "@/lib/utils";

export default function DispatchVehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/vehicles")
      .then((res) => res.json())
      .then((data) => {
        // Filter out RETIRED
        const active = Array.isArray(data) ? data.filter((v: any) => v.status !== "RETIRED") : [];
        setVehicles(active);
        setLoading(false);
      });
  }, []);

  const columns: Column<any>[] = [
    { key: "registrationNumber", label: "Reg. Number", sortable: true },
    { key: "name", label: "Name", sortable: true },
    { key: "model", label: "Model" },
    { key: "type", label: "Type" },
    { key: "maximumLoadCapacity", label: "Max Load", render: (v: unknown) => `${v}T` },
    { key: "odometer", label: "Odometer", render: (v: unknown) => `${formatNumber(v as number)} km` },
    { key: "region", label: "Region" },
    { key: "status", label: "Status", render: (v: unknown) => <StatusBadge status={v as string} /> },
  ];

  return (
    <div style={{ padding: "36px 44px" }}>
      <PageHeader title="Vehicle Availability" description="Check which vehicles are available for dispatch" breadcrumb="Dispatcher" />
      <DataTable loading={loading} columns={columns} data={vehicles as unknown as Record<string, unknown>[]} searchPlaceholder="Search vehicles..." />
    </div>
  );
}
