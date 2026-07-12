"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, ExternalLink, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/AppHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/utils";

interface Driver {
  id: string; name: string; licenseNumber: string; licenseCategory: string;
  licenseExpiryDate: string; contactNumber: string; safetyScore: number;
  status: string; licenseState: "VALID" | "EXPIRING_SOON" | "EXPIRED";
}

const LICENSE_STATES = ["VALID", "EXPIRING_SOON", "EXPIRED"];
const emptyForm = { name: "", licenseNumber: "", licenseCategory: "HMV", licenseExpiryDate: "", contactNumber: "", safetyScore: "100" };

function LicenseBadge({ state }: { state: string }) {
  const cfg = state === "VALID"
    ? { bg: "#f0fdf4", color: "#16a34a", icon: <CheckCircle className="w-3 h-3" /> }
    : state === "EXPIRING_SOON"
    ? { bg: "#fffbeb", color: "#d97706", icon: <Clock className="w-3 h-3" /> }
    : { bg: "#fef2f2", color: "#dc2626", icon: <AlertTriangle className="w-3 h-3" /> };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.icon} {state.replace("_", " ")}
    </span>
  );
}

export default function DriversPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [licenseFilter, setLicenseFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/drivers?${params}`);
    let data = await res.json();
    if (licenseFilter) data = data.filter((d: Driver) => d.licenseState === licenseFilter);
    setDrivers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [statusFilter, licenseFilter]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  function openCreate() { setForm({ ...emptyForm }); setEditDriver(null); setShowForm(true); }
  function openEdit(d: Driver) {
    setForm({ name: d.name, licenseNumber: d.licenseNumber, licenseCategory: d.licenseCategory, licenseExpiryDate: d.licenseExpiryDate.split("T")[0], contactNumber: d.contactNumber, safetyScore: String(d.safetyScore) });
    setEditDriver(d); setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const url = editDriver ? `/api/drivers/${editDriver.id}` : "/api/drivers";
    const method = editDriver ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) toast.error(data.error);
    else { toast.success(editDriver ? "Driver updated" : "Driver added"); setShowForm(false); fetchDrivers(); }
    setSubmitting(false);
  }

  async function handleSuspend(id: string, suspend: boolean) {
    const res = await fetch(`/api/drivers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: suspend ? "SUSPENDED" : "AVAILABLE" }),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error);
    else { toast.success(suspend ? "Driver suspended" : "Driver reinstated"); fetchDrivers(); }
  }

  // Compliance summary
  const expired = drivers.filter(d => d.licenseState === "EXPIRED").length;
  const expiringSoon = drivers.filter(d => d.licenseState === "EXPIRING_SOON").length;
  const suspended = drivers.filter(d => d.status === "SUSPENDED").length;

  const columns: Column<Record<string, unknown>>[] = [
    { key: "name", label: "Driver", sortable: true, render: (v, row) => (
      <div>
        <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{v as string}</p>
        <p className="text-xs font-mono" style={{ color: "#94a3b8" }}>{row.licenseNumber as string}</p>
      </div>
    )},
    { key: "licenseCategory", label: "Category" },
    { key: "licenseExpiryDate", label: "License Expiry", render: (v) => formatDate(v as string) },
    { key: "licenseState", label: "License State", render: (v) => <LicenseBadge state={v as string} /> },
    { key: "safetyScore", label: "Safety Score", sortable: true, render: (v) => {
      const score = v as number;
      const color = score >= 90 ? "#16a34a" : score >= 75 ? "#d97706" : "#dc2626";
      return <span className="font-semibold" style={{ color }}>{score}</span>;
    }},
    { key: "contactNumber", label: "Contact" },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
    {
      key: "_actions", label: "", className: "w-28",
      render: (_, row) => {
        const d = row as unknown as Driver;
        return (
          <div className="flex gap-1 justify-end">
            <button onClick={(e) => { e.stopPropagation(); router.push(`/safety/drivers/${d.id}`); }} className="p-1.5 rounded hover:bg-slate-50" title="Details"><ExternalLink className="w-3.5 h-3.5 text-slate-400" /></button>
            <button onClick={(e) => { e.stopPropagation(); openEdit(d); }} className="p-1.5 rounded hover:bg-blue-50 text-xs font-medium" style={{ color: "#2563eb" }}>Edit</button>
            {d.status !== "ON_TRIP" && (
              d.status === "SUSPENDED"
                ? <button onClick={(e) => { e.stopPropagation(); handleSuspend(d.id, false); }} className="p-1.5 rounded hover:bg-green-50 text-xs font-medium" style={{ color: "#16a34a" }}>Reinstate</button>
                : <button onClick={(e) => { e.stopPropagation(); handleSuspend(d.id, true); }} className="p-1.5 rounded hover:bg-red-50 text-xs font-medium" style={{ color: "#dc2626" }}>Suspend</button>
            )}
          </div>
        );
      }
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Drivers & Compliance"
        description="Monitor driver licenses, safety scores and status"
        breadcrumb="Safety Officer"
        actions={
          <button onClick={openCreate} className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#2563eb" }}>
            <Plus className="w-4 h-4" /> Add Driver
          </button>
        }
      />

      {/* Compliance Alerts */}
      {(expired > 0 || expiringSoon > 0 || suspended > 0) && (
        <div className="flex gap-3 mb-5">
          {expired > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <p className="text-sm font-medium" style={{ color: "#dc2626" }}>{expired} Expired License{expired > 1 ? "s" : ""}</p>
            </div>
          )}
          {expiringSoon > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
              <Clock className="w-4 h-4 text-yellow-500" />
              <p className="text-sm font-medium" style={{ color: "#d97706" }}>{expiringSoon} Expiring Soon</p>
            </div>
          )}
          {suspended > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <p className="text-sm font-medium" style={{ color: "#ea580c" }}>{suspended} Suspended</p>
            </div>
          )}
        </div>
      )}

      <DataTable
        columns={columns}
        data={drivers as unknown as Record<string, unknown>[]}
        loading={loading}
        searchPlaceholder="Search drivers..."
        searchKeys={["name", "licenseNumber", "contactNumber"]}
        filters={
          <div className="flex gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: "#e2e8f0", color: "#374151" }}>
              {["", "AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"].map(s => <option key={s} value={s}>{s || "All Status"}</option>)}
            </select>
            <select value={licenseFilter} onChange={(e) => setLicenseFilter(e.target.value)} className="text-xs border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: "#e2e8f0", color: "#374151" }}>
              <option value="">All Licenses</option>
              {LICENSE_STATES.map(l => <option key={l}>{l.replace("_", " ")}</option>)}
            </select>
          </div>
        }
      />

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4" style={{ border: "1px solid #e2e8f0" }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <h3 className="text-sm font-semibold" style={{ color: "#0f172a" }}>{editDriver ? "Edit Driver" : "Add Driver"}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Full Name *", key: "name", placeholder: "Alex Fernandes" },
                  { label: "License Number *", key: "licenseNumber", placeholder: "GJ01XXYYYYY", disabled: !!editDriver },
                  { label: "Contact Number *", key: "contactNumber", type: "tel", placeholder: "9876540000" },
                  { label: "Safety Score (0-100)", key: "safetyScore", type: "number", placeholder: "95" },
                  { label: "License Expiry Date *", key: "licenseExpiryDate", type: "date", placeholder: "" },
                ].map(({ label, key, type, placeholder, disabled }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>{label}</label>
                    <input required={!label.includes("Safety")} type={type || "text"} disabled={disabled} placeholder={placeholder} value={(form as Record<string, string>)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50" style={{ borderColor: "#e2e8f0" }} />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>License Category *</label>
                  <select required value={form.licenseCategory} onChange={(e) => setForm({ ...form, licenseCategory: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }}>
                    {["HMV", "LMV", "MMV", "TRANS"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-5">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#e2e8f0", color: "#374151" }}>Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: "#2563eb" }}>{submitting ? "Saving..." : editDriver ? "Update" : "Add Driver"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
