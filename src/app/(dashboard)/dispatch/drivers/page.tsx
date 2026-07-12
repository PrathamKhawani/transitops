import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/AppHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/utils";

export default async function DispatchDriversPage() {
  const session = await requireAuth();
  if (!session || session.role !== "DISPATCHER") redirect("/login");

  const drivers = await prisma.driver.findMany({ orderBy: { status: "asc" } });

  const columns = [
    { key: "name", label: "Name", sortable: true },
    { key: "licenseNumber", label: "License No." },
    { key: "licenseCategory", label: "Category" },
    { key: "licenseExpiryDate", label: "License Expiry", render: (v: unknown) => formatDate(v as string) },
    { key: "contactNumber", label: "Contact" },
    { key: "safetyScore", label: "Safety Score", render: (v: unknown) => `${v}/100` },
    { key: "status", label: "Status", render: (v: unknown) => <StatusBadge status={v as string} /> },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Driver Availability" description="Check which drivers are available for assignment" breadcrumb="Dispatcher" />
      <DataTable columns={columns} data={drivers as unknown as Record<string, unknown>[]} searchPlaceholder="Search drivers..." />
    </div>
  );
}
