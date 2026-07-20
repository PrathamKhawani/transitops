"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Users, Edit2, X } from "lucide-react";
import { PageHeader } from "@/components/layout/AppHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/utils";
import { isExpired, isExpiringSoon } from "@/lib/utils";

interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: string;
  contactNumber: string;
  safetyScore: number;
  status: string;
}

const columns: Column<Record<string, unknown>>[] = [
  { key: "name", label: "Name", sortable: true },
  { key: "licenseNumber", label: "License No." },
  { key: "licenseCategory", label: "Category" },
  {
    key: "licenseExpiryDate", label: "License Expiry",
    render: (v) => {
      const expired = isExpired(v as string);
      const expiring = isExpiringSoon(v as string);
      return (
        <span style={{ color: expired ? "#dc2626" : expiring ? "#d97706" : "#374151", fontWeight: expired || expiring ? 500 : 400 }}>
          {formatDate(v as string)}
          {expired && " ⚠️"}{expiring && !expired && " ⏳"}
        </span>
      );
    }
  },
  { key: "contactNumber", label: "Contact" },
  { key: "safetyScore", label: "Safety Score", sortable: true, render: (v) => <span style={{ color: Number(v) >= 90 ? "#16a34a" : Number(v) >= 75 ? "#d97706" : "#dc2626", fontWeight: 600 }}>{Number(v)}/100</span> },
  { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
];

export default function FleetDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ status: "AVAILABLE", safetyScore: "100" });

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/drivers?${params}`);
    const data = await res.json();
    setDrivers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  function openEdit(d: Driver) {
    setEditDriver(d);
    setForm({ status: d.status, safetyScore: String(d.safetyScore) });
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editDriver) return;
    setSubmitting(true);
    const res = await fetch(`/api/drivers/${editDriver.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error);
    else { toast.success("Driver updated"); setEditDriver(null); fetchDrivers(); }
    setSubmitting(false);
  }

  const columnsWithActions: Column<Record<string, unknown>>[] = [
    ...columns,
    {
      key: "_actions",
      label: "",
      className: "w-16",
      render: (_, row) => {
        const d = row as unknown as Driver;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEdit(d);
            }}
            className="p-1.5 rounded hover:bg-blue-50"
            title="Edit status"
          >
            <Edit2 className="w-3.5 h-3.5 text-blue-500" />
          </button>
        );
      },
    },
  ];

  return (
    <div style={{ padding: "36px 44px" }}>
      <PageHeader title="Drivers" description="View fleet drivers and license status" breadcrumb="Fleet Manager" />
      <DataTable
        columns={columnsWithActions}
        data={drivers as unknown as Record<string, unknown>[]}
        loading={loading}
        searchPlaceholder="Search drivers..."
        filters={
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: "#e2e8f0", color: "#374151" }}>
            {["", "AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"].map((s) => <option key={s} value={s}>{s || "All Status"}</option>)}
          </select>
        }
      />

      {editDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setEditDriver(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4" style={{ border: "1px solid #e2e8f0" }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <h3 className="text-sm font-semibold" style={{ color: "#0f172a" }}>Update Driver — {editDriver.name}</h3>
              <button onClick={() => setEditDriver(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }}>
                  {["AVAILABLE", "OFF_DUTY", "SUSPENDED"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Safety Score (0-100)</label>
                <input type="number" min={0} max={100} value={form.safetyScore} onChange={(e) => setForm({ ...form, safetyScore: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setEditDriver(null)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#e2e8f0", color: "#374151" }}>Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: "#2563eb" }}>{submitting ? "Saving..." : "Update"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
