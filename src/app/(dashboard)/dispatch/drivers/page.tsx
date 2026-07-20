"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/AppHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/utils";
function getLicenseState(expiryDate: Date | string): "VALID" | "EXPIRING_SOON" | "EXPIRED" {
  const now = new Date();
  const expiry = new Date(expiryDate);
  if (expiry <= now) return "EXPIRED";
  const daysLeft = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysLeft <= 30 ? "EXPIRING_SOON" : "VALID";
}

export default function DispatchDriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/drivers")
      .then((res) => res.json())
      .then((data) => {
        const driversList = Array.isArray(data) ? data : [];
        const driversWithEligibility = driversList.map((d: any) => {
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
        setDrivers(driversWithEligibility);
        setLoading(false);
      });
  }, []);

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
      <DataTable loading={loading} columns={columns} data={drivers as unknown as Record<string, unknown>[]} searchPlaceholder="Search drivers..." />
    </div>
  );
}
