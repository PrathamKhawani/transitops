import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/AppHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/utils";
import { getLicenseState } from "@/lib/domain";

export default async function DispatchDriversPage() {
  const session = await requireAuth();
  if (!session || session.role !== "DISPATCHER") redirect("/login");

  const drivers = await prisma.driver.findMany({ orderBy: { status: "asc" } });

  // Map drivers to add eligibility info
  const driversWithEligibility = drivers.map(d => {
    let eligible = true;
    let reason = "Ready";

    if (d.status === "SUSPENDED") {
      eligible = false;
      reason = "Suspended";
    } else if (d.status === "ON_TRIP") {
      eligible = false;
      reason = "On Trip";
    } else if (d.status === "OFF_DUTY") {
      eligible = false;
      reason = "Off Duty";
    } else {
      const state = getLicenseState(d.licenseExpiryDate);
      if (state === "EXPIRED") {
        eligible = false;
        reason = "Expired";
      }
    }

    return {
      ...d,
      eligibility: eligible ? "Eligible" : `Ineligible: ${reason}`,
      eligible,
    };
  });

  const columns: Column<any>[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "licenseNumber", label: "License No." },
    { key: "licenseCategory", label: "Category" },
    { key: "licenseExpiryDate", label: "License Expiry", render: (v: unknown) => formatDate(v as string) },
    { key: "contactNumber", label: "Contact" },
    { key: "safetyScore", label: "Safety Score", render: (v: unknown) => `${v}/100` },
    { key: "status", label: "Status", render: (v: unknown) => <StatusBadge status={v as string} /> },
    {
      key: "eligibility",
      label: "Eligibility",
      render: (v: unknown, row: any) => (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
          style={{
            background: row.eligible ? "#f0fdf4" : "#fef2f2",
            color: row.eligible ? "#16a34a" : "#dc2626",
          }}
        >
          {v as string}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Driver Availability" description="Check which drivers are available for assignment" breadcrumb="Dispatcher" />
      <DataTable columns={columns} data={driversWithEligibility as unknown as Record<string, unknown>[]} searchPlaceholder="Search drivers..." />
    </div>
  );
}
