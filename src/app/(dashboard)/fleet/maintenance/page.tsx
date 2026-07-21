"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, X, Play, CheckCircle, XCircle, Wrench } from "lucide-react";
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
    {
      key: "vehicle",
      label: "Vehicle",
      render: (v) => (
        <div>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: "#09090B" }}>{(v as { name: string }).name}</p>
          <p style={{ fontSize: 11, color: "#A1A1AA", marginTop: 1, fontFamily: "monospace" }}>
            {(v as { registrationNumber: string }).registrationNumber}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      label: "Service Type",
      sortable: true,
      render: (v) => (
        <span className="chip chip-blue" style={{ fontWeight: 500 }}>
          <Wrench style={{ width: 11, height: 11 }} /> {String(v)}
        </span>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (v) => <span style={{ color: "#3F3F46" }}>{String(v)}</span>,
    },
    {
      key: "cost",
      label: "Cost",
      sortable: true,
      render: (v) => (
        <span style={{ fontWeight: 600, color: "#09090B" }}>{formatCurrency(v as number)}</span>
      ),
    },
    { key: "startDate", label: "Start Date", render: (v) => formatDate(v as string) },
    { key: "completedDate", label: "Completed Date", render: (v) => v ? formatDate(v as string) : "—" },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
    {
      key: "_actions",
      label: "Actions",
      className: "text-right",
      render: (_, row) => {
        const log = row as unknown as MaintenanceLog;
        return (
          <div className="flex gap-2 justify-end">
            {log.status === "SCHEDULED" && (
              <button
                onClick={(e) => { e.stopPropagation(); setActionId(log.id); setAction("start"); }}
                className="btn btn-blue-soft btn-sm"
                title="Start Service"
              >
                <Play className="w-3.5 h-3.5" /> Start
              </button>
            )}
            {["SCHEDULED", "IN_PROGRESS"].includes(log.status) && (
              <button
                onClick={(e) => { e.stopPropagation(); setActionId(log.id); setAction("complete"); setFinalCost(String(log.cost)); }}
                className="btn btn-ghost btn-sm"
                style={{ color: "#059669", background: "#ECFDF5", borderColor: "#D1FAE5" }}
                title="Complete Service"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Complete
              </button>
            )}
            {!["COMPLETED", "CANCELLED"].includes(log.status) && (
              <button
                onClick={(e) => { e.stopPropagation(); setActionId(log.id); setAction("cancel"); }}
                className="btn btn-danger btn-sm"
                title="Cancel Service"
              >
                <XCircle className="w-3.5 h-3.5" /> Cancel
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const currentLog = logs.find(l => l.id === actionId);

  return (
    <div style={{ padding: "36px 44px" }}>
      <PageHeader
        title="Maintenance Log"
        description="Schedule, track, and audit vehicle service & repair records"
        breadcrumb="Fleet Manager"
        actions={
          <button onClick={() => setShowForm(true)} className="btn btn-primary btn-lg">
            <Plus className="w-4 h-4" /> Schedule Maintenance
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={logs.map(l => ({ ...l, _actions: null })) as unknown as Record<string, unknown>[]}
        loading={loading}
        searchPlaceholder="Search maintenance records by vehicle or type..."
        filters={
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field" style={{ width: "auto", minWidth: 150 }}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || "All Statuses"}</option>)}
          </select>
        }
      />

      {/* Create Maintenance Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-box modal-box-lg">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Schedule Vehicle Maintenance</h3>
                <p style={{ fontSize: 12, color: "#71717A", marginTop: 2 }}>Log a repair order or scheduled service item</p>
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
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">Vehicle Target *</label>
                  <select required value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} className="input-field">
                    <option value="">Select vehicle for maintenance...</option>
                    {vehicles.filter(v => !["ON_TRIP", "RETIRED"].includes(v.status)).map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber}) — Status: {v.status}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">Service Type *</label>
                    <select required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
                      {MAINTENANCE_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">Estimated Cost (₹) *</label>
                    <input required type="number" min="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="5000" className="input-field" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">Start Date *</label>
                    <input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">Initial Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field">
                      <option value="SCHEDULED">SCHEDULED — Keep Available for now</option>
                      <option value="IN_PROGRESS">IN_PROGRESS — Move to IN_SHOP immediately</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">Service Notes & Description *</label>
                  <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Provide details regarding the maintenance work required..." className="input-field" />
                </div>

                {form.status === "IN_PROGRESS" && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                    <span>⚠️</span>
                    <span>Selecting <strong>IN_PROGRESS</strong> will automatically set the vehicle state to <strong>IN_SHOP</strong> and pause trip dispatching.</span>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? "Saving Record..." : "Schedule Maintenance"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Maintenance Modal */}
      {action === "complete" && actionId && currentLog && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3 className="modal-title">Complete Maintenance Order</h3>
              <button onClick={() => { setActionId(null); setAction(null); }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-gray-700 leading-relaxed">
                Completing service order for <strong className="text-gray-900">{currentLog.vehicle.name}</strong> ({currentLog.type}).<br />
                Upon completion, the vehicle status will automatically return to <strong className="text-emerald-700">AVAILABLE</strong> for dispatch.
              </p>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">Final Audited Cost (₹) *</label>
                <input type="number" value={finalCost} onChange={(e) => setFinalCost(e.target.value)} className="input-field" placeholder="Enter final cost" />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => { setActionId(null); setAction(null); }} className="btn btn-ghost">Cancel</button>
              <button onClick={() => handleAction(actionId, "complete", { cost: Number(finalCost) })} className="btn btn-primary" style={{ background: "#059669" }}>
                Complete & Release Vehicle
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={action === "start" && !!actionId}
        title="Start Maintenance Order"
        description={`${currentLog?.vehicle.name} will be marked as IN_SHOP and hidden from dispatch roster.`}
        confirmLabel="Start Maintenance"
        variant="warning"
        onConfirm={() => handleAction(actionId!, "start")}
        onCancel={() => { setActionId(null); setAction(null); }}
      />

      <ConfirmDialog
        open={action === "cancel" && !!actionId}
        title="Cancel Maintenance Order"
        description={`Are you sure you want to cancel the maintenance record for ${currentLog?.vehicle.name}?`}
        confirmLabel="Cancel Maintenance"
        variant="danger"
        onConfirm={() => handleAction(actionId!, "cancel")}
        onCancel={() => { setActionId(null); setAction(null); }}
      />
    </div>
  );
}
