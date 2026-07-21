"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, X, User, Edit2 } from "lucide-react";
import { PageHeader } from "@/components/layout/AppHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate, isExpired, isExpiringSoon } from "@/lib/utils";

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

const emptyForm = { name: "", licenseNumber: "", licenseCategory: "HMV", licenseExpiryDate: "", contactNumber: "", safetyScore: "100", status: "AVAILABLE" };

export default function FleetDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

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

  function openCreate() { setForm({ ...emptyForm }); setEditDriver(null); setShowForm(true); }
  function openEdit(d: Driver) {
    setEditDriver(d);
    setForm({
      name: d.name,
      licenseNumber: d.licenseNumber,
      licenseCategory: d.licenseCategory,
      licenseExpiryDate: d.licenseExpiryDate ? d.licenseExpiryDate.split("T")[0] : "",
      contactNumber: d.contactNumber,
      safetyScore: String(d.safetyScore),
      status: d.status,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const url = editDriver ? `/api/drivers/${editDriver.id}` : "/api/drivers";
    const method = editDriver ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) toast.error(data.error);
    else { toast.success(editDriver ? "Driver updated successfully" : "Driver added successfully"); setShowForm(false); fetchDrivers(); }
    setSubmitting(false);
  }

  const columns: Column<Record<string, unknown>>[] = [
    { key: "name", label: "Driver", sortable: true, render: (v, row) => (
      <div>
        <p className="text-sm font-semibold" style={{ color: "#09090B" }}>{v as string}</p>
        <p className="text-xs font-mono" style={{ color: "#A1A1AA", marginTop: 1 }}>{row.licenseNumber as string}</p>
      </div>
    )},
    { key: "licenseCategory", label: "Category", render: (v) => <span className="chip chip-blue" style={{ fontWeight: 500 }}>{v as string}</span> },
    {
      key: "licenseExpiryDate", label: "License Expiry",
      render: (v) => {
        const expired = isExpired(v as string);
        const expiring = isExpiringSoon(v as string);
        return (
          <span style={{ color: expired ? "#DC2626" : expiring ? "#D97706" : "#3F3F46", fontWeight: expired || expiring ? 600 : 400 }}>
            {formatDate(v as string)}
            {expired && " ⚠️ OVERDUE"}{expiring && !expired && " ⏳ EXPIRING"}
          </span>
        );
      }
    },
    { key: "contactNumber", label: "Contact" },
    {
      key: "safetyScore", label: "Safety Score", sortable: true,
      render: (v) => (
        <span style={{ color: Number(v) >= 90 ? "#059669" : Number(v) >= 75 ? "#D97706" : "#DC2626", fontWeight: 700 }}>
          {Number(v)}/100
        </span>
      )
    },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
    {
      key: "_actions", label: "Actions", className: "text-right",
      render: (_, row) => {
        const d = row as unknown as Driver;
        return (
          <div className="flex gap-2 justify-end">
            <button
              onClick={(e) => { e.stopPropagation(); openEdit(d); }}
              className="btn btn-ghost btn-sm"
              title="Edit Driver"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ padding: "36px 44px" }}>
      <PageHeader
        title="Drivers"
        description="Manage driver roster, licensing categories, safety records, and duty statuses"
        breadcrumb="Fleet Manager"
        actions={
          <button onClick={openCreate} className="btn btn-primary btn-lg">
            <Plus className="w-4 h-4" /> Add Driver
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={drivers as unknown as Record<string, unknown>[]}
        loading={loading}
        searchPlaceholder="Search drivers by name, license number, or contact..."
        searchKeys={["name", "licenseNumber", "contactNumber"]}
        filters={
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field" style={{ width: "auto", minWidth: 150 }}>
            {["", "AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"].map((s) => <option key={s} value={s}>{s || "All Statuses"}</option>)}
          </select>
        }
      />

      {/* Add / Edit Driver Modal — Standardized to Maintenance Modal Design */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-box modal-box-lg">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{editDriver ? `Edit Driver — ${editDriver.name}` : "Add New Driver"}</h3>
                <p style={{ fontSize: 12, color: "#71717A", marginTop: 2 }}>
                  {editDriver ? "Update license status, safety score, or duty status" : "Register a new commercial driver into the fleet roster"}
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Alex Fernandes"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      License Number *
                    </label>
                    <input
                      required
                      type="text"
                      disabled={!!editDriver}
                      placeholder="e.g. GJ01XXYYYYY"
                      value={form.licenseNumber}
                      onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                      className="input-field disabled:opacity-60 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Contact Phone Number *
                    </label>
                    <input
                      required
                      type="tel"
                      placeholder="e.g. 9876540000"
                      value={form.contactNumber}
                      onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      License Category *
                    </label>
                    <select
                      required
                      value={form.licenseCategory}
                      onChange={(e) => setForm({ ...form, licenseCategory: e.target.value })}
                      className="input-field"
                    >
                      {["HMV", "LMV", "MMV", "TRANS"].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      License Expiry Date *
                    </label>
                    <input
                      required
                      type="date"
                      value={form.licenseExpiryDate}
                      onChange={(e) => setForm({ ...form, licenseExpiryDate: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Safety Score (0 - 100) *
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      max="100"
                      placeholder="95"
                      value={form.safetyScore}
                      onChange={(e) => setForm({ ...form, safetyScore: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                {editDriver && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Duty Status *
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="input-field"
                    >
                      {["AVAILABLE", "OFF_DUTY", "SUSPENDED"].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  <User className="w-4 h-4" />
                  {submitting ? "Saving Driver..." : editDriver ? "Update Driver" : "Add Driver"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
