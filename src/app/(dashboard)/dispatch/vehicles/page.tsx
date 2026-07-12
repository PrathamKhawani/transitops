import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/AppHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";

export default async function DispatchVehiclesPage() {
  const session = await requireAuth();
  if (!session || session.role !== "DISPATCHER") redirect("/login");

  const vehicles = await prisma.vehicle.findMany({
    where: { status: { not: "RETIRED" } },
    orderBy: { status: "asc" },
  });

  const columns = [
    { key: "registrationNumber", label: "Reg. Number", sortable: true },
    { key: "name", label: "Name", sortable: true },
    { key: "model", label: "Model" },
    { key: "type", label: "Type" },
    { key: "maximumLoadCapacity", label: "Max Load", render: (v: unknown) => `${v}T` },
    { key: "region", label: "Region" },
    { key: "status", label: "Status", render: (v: unknown) => <StatusBadge status={v as string} /> },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Vehicle Availability" description="Check which vehicles are available for dispatch" breadcrumb="Dispatcher" />
      <DataTable columns={columns} data={vehicles as unknown as Record<string, unknown>[]} searchPlaceholder="Search vehicles..." />
    </div>
  );
}
