"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, X, Play, CheckCircle, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/AppHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { formatCurrency, formatDate } from "@/lib/utils";

interface MaintenanceLog {
  id: string; type: string; description: string; cost: number;
  startDate: string; completedDate: string | null; status: string;
  vehicle: { name: string; registrationNumber: string; status: string };
}

interface Vehicle { id: string; name: string; registrationNumber: string; status: string; }

const MAINTENANCE_TYPES = ["Scheduled Service", "Repair", "Tyre Replacement", "Electrical Repair", "Body Work", "Inspection", "Oil Change"];
const STATUS_OPTIONS = ["", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export default function MaintenancePage() {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ vehicleId: "", type: "Oil Change", description: "", cost: "", startDate: "", status: "IN_PROGRESS" });
  const [actionId, setActionId] = useState<string | null>(null);
  const [action, setAction] = useState<"start" | "complete" | "cancel" | null>(null);
  const [finalCost, setFinalCost] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/maintenance?${params}`);
    const data = await res.json();
    setLogs(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => {
    fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error);
    else {
      toast.success(
        form.status === "IN_PROGRESS"
          ? `Maintenance started — ${(vehicles.find(v => v.id === form.vehicleId))?.name} is now IN_SHOP`
          : "Maintenance scheduled"
      );
      setShowForm(false);
      fetchLogs();
    }
    setSubmitting(false);
  }

  async function handleAction(id: string, act: string, extra?: Record<string, unknown>) {
    const res = await fetch(`/api/maintenance/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: act, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error);
    else {
      const msg = act === "start" ? "Maintenance started — vehicle set to IN_SHOP"
        : act === "complete" ? "Maintenance completed — vehicle returned to AVAILABLE"
        : "Maintenance cancelled";
      toast.success(msg);
      fetchLogs();
    }
    setActionId(null); setAction(null);
  }

  const columns: Column<Record<string, unknown>>[] = [
    { key: "vehicle", label: "Vehicle", render: (v) => <span>{(v as {name:string}).name}<br /><span className="text-xs" style={{ color: "#94a3b8" }}>{(v as {registrationNumber:string}).registrationNumber}</span></span> },
    { key: "type", label: "Type", sortable: true },
    { key: "description", label: "Description" },
    { key: "cost", label: "Cost", render: (v) => formatCurrency(v as number) },
    { key: "startDate", label: "Start", render: (v) => formatDate(v as string) },
    { key: "completedDate", label: "Completed", render: (v) => v ? formatDate(v as string) : "—" },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
    {
      key: "_actions", label: "", className: "w-24",
      render: (_, row) => {
        const log = row as unknown as MaintenanceLog;
        return (
          <div className="flex gap-1 justify-end">
            {log.status === "SCHEDULED" && (
              <button onClick={(e) => { e.stopPropagation(); setActionId(log.id); setAction("start"); }} className="p-1.5 rounded hover:bg-blue-50" title="Start"><Play className="w-3.5 h-3.5 text-blue-500" /></button>
            )}
            {["SCHEDULED", "IN_PROGRESS"].includes(log.status) && (
              <button onClick={(e) => { e.stopPropagation(); setActionId(log.id); setAction("complete"); setFinalCost(String(log.cost)); }} className="p-1.5 rounded hover:bg-green-50" title="Complete"><CheckCircle className="w-3.5 h-3.5 text-green-500" /></button>
            )}
            {!["COMPLETED", "CANCELLED"].includes(log.status) && (
              <button onClick={(e) => { e.stopPropagation(); setActionId(log.id); setAction("cancel"); }} className="p-1.5 rounded hover:bg-red-50" title="Cancel"><XCircle className="w-3.5 h-3.5 text-red-400" /></button>
            )}
          </div>
        );
      }
    },
  ];

  const currentLog = logs.find(l => l.id === actionId);

  return (
    <div className="p-6">
      <PageHeader
        title="Maintenance"
        description="Schedule and track vehicle maintenance"
        breadcrumb="Fleet Manager"
        actions={
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#2563eb" }}>
            <Plus className="w-4 h-4" /> Schedule Maintenance
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={logs.map(l => ({ ...l, _actions: null })) as unknown as Record<string, unknown>[]}
        loading={loading}
        searchPlaceholder="Search maintenance..."
        filters={
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: "#e2e8f0", color: "#374151" }}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || "All Status"}</option>)}
          </select>
        }
      />

      {/* Create Maintenance Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4" style={{ border: "1px solid #e2e8f0" }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <h3 className="text-sm font-semibold" style={{ color: "#0f172a" }}>Schedule Maintenance</h3>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Vehicle *</label>
                <select required value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }}>
                  <option value="">Select vehicle...</option>
                  {vehicles.filter(v => !["ON_TRIP", "RETIRED"].includes(v.status)).map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber}) — {v.status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Type *</label>
                <select required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }}>
                  {MAINTENANCE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Description *</label>
                <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Describe the maintenance work..." className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Estimated Cost (₹) *</label>
                  <input required type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="5000" className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Start Date *</label>
                  <input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }}>
                  <option value="SCHEDULED">SCHEDULED — Vehicle stays AVAILABLE</option>
                  <option value="IN_PROGRESS">IN_PROGRESS — Vehicle set to IN_SHOP immediately</option>
                </select>
                {form.status === "IN_PROGRESS" && (
                  <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "#d97706" }}>
                    ⚠️ Selecting IN_PROGRESS will atomically set the vehicle to IN_SHOP and remove it from dispatch
                  </p>
                )}
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#e2e8f0", color: "#374151" }}>Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: "#2563eb" }}>{submitting ? "Saving..." : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete — final cost modal */}
      {action === "complete" && actionId && currentLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => { setActionId(null); setAction(null); }} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4" style={{ border: "1px solid #e2e8f0" }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <h3 className="text-sm font-semibold" style={{ color: "#0f172a" }}>Complete Maintenance</h3>
              <button onClick={() => { setActionId(null); setAction(null); }}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm" style={{ color: "#374151" }}>
                Completing <strong>{currentLog.type}</strong> on <strong>{currentLog.vehicle.name}</strong>.<br />
                The vehicle will be set back to <strong>AVAILABLE</strong>.
              </p>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Final Cost (₹)</label>
                <input type="number" value={finalCost} onChange={(e) => setFinalCost(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setActionId(null); setAction(null); }} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#e2e8f0", color: "#374151" }}>Cancel</button>
                <button onClick={() => handleAction(actionId, "complete", { cost: Number(finalCost) })} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#16a34a" }}>Complete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={action === "start" && !!actionId}
        title="Start Maintenance"
        description={`${currentLog?.vehicle.name} will be set to IN_SHOP and will not appear in dispatch vehicle selection.`}
        confirmLabel="Start Maintenance"
        variant="warning"
        onConfirm={() => handleAction(actionId!, "start")}
        onCancel={() => { setActionId(null); setAction(null); }}
      />

      <ConfirmDialog
        open={action === "cancel" && !!actionId}
        title="Cancel Maintenance"
        description={`Cancel ${currentLog?.type} on ${currentLog?.vehicle.name}? If the vehicle is IN_SHOP, it will be returned to AVAILABLE.`}
        confirmLabel="Cancel Maintenance"
        variant="danger"
        onConfirm={() => handleAction(actionId!, "cancel")}
        onCancel={() => { setActionId(null); setAction(null); }}
      />
    </div>
  );
}
