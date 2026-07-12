"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, Play, CheckCircle, XCircle, Eye, CheckCheck, AlertTriangle, Clock } from "lucide-react";
import { PageHeader } from "@/components/layout/AppHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

interface Trip {
  id: string; tripCode: string; source: string; destination: string;
  cargoWeight: number; plannedDistance: number; actualDistance: number | null;
  revenue: number; fuelConsumed: number | null; status: string;
  dispatchedAt: string | null; completedAt: string | null; createdAt: string;
  initialOdometer: number; finalOdometer: number | null;
  vehicle: { name: string; registrationNumber: string; type: string; maximumLoadCapacity: number };
  driver: { name: string; licenseCategory: string };
}

interface Vehicle { id: string; name: string; registrationNumber: string; type: string; maximumLoadCapacity: number; status: string; }
interface Driver { id: string; name: string; licenseNumber: string; licenseCategory: string; licenseExpiryDate: string; safetyScore: number; status: string; licenseState: string; }

interface DispatchCheck {
  vehicleAvailable: boolean; driverAvailable: boolean; licenseValid: boolean; capacityValid: boolean;
  canDispatch: boolean; errors: string[]; warnings: string[];
}

const emptyForm = { source: "", destination: "", vehicleId: "", driverId: "", cargoWeight: "", plannedDistance: "", revenue: "", initialOdometer: "" };

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [dispatchId, setDispatchId] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [completeForm, setCompleteForm] = useState({ finalOdometer: "", actualDistance: "", fuelConsumed: "" });
  const [submitting, setSubmitting] = useState(false);
  const [dispatchCheck, setDispatchCheck] = useState<DispatchCheck | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const checkTimer = useRef<NodeJS.Timeout | null>(null);
  const searchParams = useSearchParams();
  const prefillApplied = useRef(false);

  // Prefill from Smart Dispatch recommendation
  useEffect(() => {
    if (prefillApplied.current) return;
    const rec = searchParams.get("rec");
    if (rec === "1") {
      prefillApplied.current = true;
      setForm({
        source: searchParams.get("source") || "",
        destination: searchParams.get("destination") || "",
        vehicleId: searchParams.get("vehicleId") || "",
        driverId: searchParams.get("driverId") || "",
        cargoWeight: searchParams.get("cargoWeight") || "",
        plannedDistance: searchParams.get("plannedDistance") || "",
        revenue: "",
        initialOdometer: "",
      });
      setShowCreateForm(true);
    }
  }, [searchParams]);


  const fetchTrips = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/trips?${params}`);
    const data = await res.json();
    setTrips(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  useEffect(() => {
    fetch("/api/vehicles?eligible=true").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : []));
    fetch("/api/drivers?eligible=true").then(r => r.json()).then(d => setDrivers(Array.isArray(d) ? d : []));
  }, [showCreateForm]);

  // Live pre-dispatch check
  useEffect(() => {
    if (!form.vehicleId || !form.driverId || !form.cargoWeight) {
      setDispatchCheck(null);
      return;
    }
    if (checkTimer.current) clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(async () => {
      setCheckLoading(true);
      try {
        const res = await fetch("/api/trips/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vehicleId: form.vehicleId, driverId: form.driverId, cargoWeight: Number(form.cargoWeight) }),
        });
        const data = await res.json();
        setDispatchCheck(data);
      } finally {
        setCheckLoading(false);
      }
    }, 400);
  }, [form.vehicleId, form.driverId, form.cargoWeight]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/trips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) toast.error(data.error);
    else { toast.success(`Trip ${data.tripCode} created`); setShowCreateForm(false); setForm({ ...emptyForm }); setDispatchCheck(null); fetchTrips(); }
    setSubmitting(false);
  }

  async function handleAction(id: string, action: string, extra?: Record<string, unknown>) {
    const res = await fetch(`/api/trips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error);
    else { toast.success(`Trip ${action}ed successfully`); fetchTrips(); if (selectedTrip?.id === id) setSelectedTrip(null); }
    setDispatchId(null); setCancelId(null); setShowCompleteForm(null);
  }

  const selectedVehicle = vehicles.find(v => v.id === form.vehicleId);

  const columns: Column<Record<string, unknown>>[] = [
    { key: "tripCode", label: "Trip Code", render: (v) => <span className="font-mono text-xs" style={{ color: "#475569" }}>{v as string}</span> },
    { key: "source", label: "Route", render: (_, row) => `${row.source} → ${row.destination}` },
    { key: "vehicle", label: "Vehicle", render: (v) => (v as { name: string })?.name },
    { key: "driver", label: "Driver", render: (v) => (v as { name: string })?.name },
    { key: "cargoWeight", label: "Cargo", render: (v, row) => {
      const cap = (row.vehicle as { maximumLoadCapacity: number })?.maximumLoadCapacity;
      const pct = cap ? Math.round((v as number) / cap * 100) : 0;
      return <span>{v as number}T <span className="text-xs" style={{ color: "#94a3b8" }}>({pct}%)</span></span>;
    }},
    { key: "revenue", label: "Revenue", render: (v) => formatCurrency(v as number) },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
    { key: "createdAt", label: "Created", render: (v) => formatDate(v as string) },
    {
      key: "_actions", label: "", className: "w-28",
      render: (_, row) => {
        const trip = row as unknown as Trip;
        return (
          <div className="flex gap-1 justify-end">
            <button onClick={(e) => { e.stopPropagation(); setSelectedTrip(trip); }} className="p-1.5 rounded hover:bg-slate-50" title="View"><Eye className="w-3.5 h-3.5 text-slate-400" /></button>
            {trip.status === "DRAFT" && <button onClick={(e) => { e.stopPropagation(); setDispatchId(trip.id); }} className="p-1.5 rounded hover:bg-blue-50" title="Dispatch"><Play className="w-3.5 h-3.5 text-blue-500" /></button>}
            {trip.status === "DISPATCHED" && <button onClick={(e) => { e.stopPropagation(); setShowCompleteForm(trip.id); }} className="p-1.5 rounded hover:bg-green-50" title="Complete"><CheckCircle className="w-3.5 h-3.5 text-green-500" /></button>}
            {["DRAFT", "DISPATCHED"].includes(trip.status) && <button onClick={(e) => { e.stopPropagation(); setCancelId(trip.id); }} className="p-1.5 rounded hover:bg-red-50" title="Cancel"><XCircle className="w-3.5 h-3.5 text-red-400" /></button>}
          </div>
        );
      }
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Trips"
        description="Create and manage trip lifecycle"
        breadcrumb="Dispatcher"
        actions={
          <button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#2563eb" }}>
            <Plus className="w-4 h-4" /> New Trip
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={trips as unknown as Record<string, unknown>[]}
        loading={loading}
        searchPlaceholder="Search trips..."
        filters={
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: "#e2e8f0", color: "#374151" }}>
            {["", "DRAFT", "DISPATCHED", "COMPLETED", "CANCELLED"].map((s) => <option key={s} value={s}>{s || "All Status"}</option>)}
          </select>
        }
      />

      {/* ── Create Trip Modal ─────────────────────────────────────────── */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => { setShowCreateForm(false); setDispatchCheck(null); }} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[92vh] overflow-y-auto" style={{ border: "1px solid #e2e8f0" }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <h3 className="text-sm font-semibold" style={{ color: "#0f172a" }}>New Trip</h3>
              <button onClick={() => { setShowCreateForm(false); setDispatchCheck(null); }}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>From *</label>
                  <input required value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Ahmedabad" className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>To *</label>
                  <input required value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Surat" className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
                </div>

                {/* Vehicle selection */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Vehicle * <span className="font-normal" style={{ color: "#94a3b8" }}>— Available only</span></label>
                  <select required value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }}>
                    <option value="">Select vehicle...</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.registrationNumber}) · {v.type} · max {v.maximumLoadCapacity}T
                      </option>
                    ))}
                  </select>
                </div>

                {/* Driver selection */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Driver * <span className="font-normal" style={{ color: "#94a3b8" }}>— Available + valid license only</span></label>
                  <select required value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }}>
                    <option value="">Select driver...</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} · {d.licenseCategory} · {d.licenseState === "EXPIRING_SOON" ? "⚠️ Expiring Soon" : "✓ Valid"} · Safety: {d.safetyScore}/100
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Cargo Weight (T) *</label>
                  <input required type="number" step="0.01" min="0.01" value={form.cargoWeight} onChange={(e) => setForm({ ...form, cargoWeight: e.target.value })} placeholder="0.45" className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
                  {selectedVehicle && <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>Max capacity: {selectedVehicle.maximumLoadCapacity}T</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Planned Distance (km) *</label>
                  <input required type="number" value={form.plannedDistance} onChange={(e) => setForm({ ...form, plannedDistance: e.target.value })} placeholder="265" className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Revenue (₹) *</label>
                  <input required type="number" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} placeholder="15000" className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Initial Odometer (km) *</label>
                  <input required type="number" value={form.initialOdometer} onChange={(e) => setForm({ ...form, initialOdometer: e.target.value })} placeholder="12000" className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
                </div>
              </div>

              {/* ── Pre-dispatch Validation Panel ── */}
              {(form.vehicleId && form.driverId && form.cargoWeight) && (
                <div className="mb-4 rounded-lg p-4" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "#64748b" }}>
                    {checkLoading ? "Checking eligibility..." : "Dispatch Eligibility"}
                  </p>
                  {checkLoading ? (
                    <div className="flex gap-6">
                      {["Vehicle", "Driver", "License", "Capacity"].map(l => (
                        <div key={l} className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: "#e2e8f0" }} />
                          <span className="text-xs" style={{ color: "#94a3b8" }}>{l}</span>
                        </div>
                      ))}
                    </div>
                  ) : dispatchCheck && (
                    <>
                      <div className="flex flex-wrap gap-4 mb-3">
                        {[
                          { label: "Vehicle Available", ok: dispatchCheck.vehicleAvailable },
                          { label: "Driver Available", ok: dispatchCheck.driverAvailable },
                          { label: "License Valid", ok: dispatchCheck.licenseValid },
                          { label: "Capacity Valid", ok: dispatchCheck.capacityValid },
                        ].map(({ label, ok }) => (
                          <div key={label} className="flex items-center gap-1.5">
                            {ok
                              ? <CheckCheck className="w-3.5 h-3.5 text-green-500" />
                              : <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                            }
                            <span className="text-xs font-medium" style={{ color: ok ? "#16a34a" : "#dc2626" }}>
                              {label} {ok ? "✓" : "✗"}
                            </span>
                          </div>
                        ))}
                      </div>
                      {dispatchCheck.errors.length > 0 && (
                        <div className="space-y-1">
                          {dispatchCheck.errors.map((err, i) => (
                            <div key={i} className="flex items-start gap-2 p-2 rounded-md" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                              <p className="text-xs" style={{ color: "#dc2626" }}>{err}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {dispatchCheck.warnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded-md mt-1" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                          <Clock className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs" style={{ color: "#d97706" }}>{w}</p>
                        </div>
                      ))}
                      {dispatchCheck.canDispatch && dispatchCheck.errors.length === 0 && (
                        <p className="text-xs font-medium" style={{ color: "#16a34a" }}>✓ All checks passed — trip can be dispatched</p>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setShowCreateForm(false); setDispatchCheck(null); }} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#e2e8f0", color: "#374151" }}>Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: "#2563eb" }}>
                  {submitting ? "Creating..." : "Create Trip"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Complete Trip Modal ── */}
      {showCompleteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowCompleteForm(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4" style={{ border: "1px solid #e2e8f0" }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <h3 className="text-sm font-semibold" style={{ color: "#0f172a" }}>Complete Trip</h3>
              <button onClick={() => setShowCompleteForm(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleAction(showCompleteForm, "complete", {
                finalOdometer: Number(completeForm.finalOdometer),
                actualDistance: Number(completeForm.actualDistance),
                fuelConsumed: Number(completeForm.fuelConsumed),
              });
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Final Odometer (km) *</label>
                <input required type="number" value={completeForm.finalOdometer} onChange={(e) => setCompleteForm({ ...completeForm, finalOdometer: e.target.value })} placeholder="12265" className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Actual Distance (km) *</label>
                <input required type="number" value={completeForm.actualDistance} onChange={(e) => setCompleteForm({ ...completeForm, actualDistance: e.target.value })} placeholder="265" className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Fuel Consumed (litres) *</label>
                <input required type="number" step="0.1" value={completeForm.fuelConsumed} onChange={(e) => setCompleteForm({ ...completeForm, fuelConsumed: e.target.value })} placeholder="30" className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowCompleteForm(null)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#e2e8f0", color: "#374151" }}>Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#16a34a" }}>Mark Complete</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Trip Detail Drawer ── */}
      {selectedTrip && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.3)" }} onClick={() => setSelectedTrip(null)} />
          <div className="relative bg-white w-full max-w-sm h-full overflow-y-auto shadow-xl" style={{ borderLeft: "1px solid #e2e8f0" }}>
            <div className="px-5 py-5" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-mono" style={{ color: "#64748b" }}>{selectedTrip.tripCode}</p>
                  <h3 className="text-sm font-semibold mt-0.5" style={{ color: "#0f172a" }}>{selectedTrip.source} → {selectedTrip.destination}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedTrip.status} />
                  <button onClick={() => setSelectedTrip(null)}><X className="w-4 h-4 text-slate-400" /></button>
                </div>
              </div>
            </div>

            {/* Lifecycle Timeline */}
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#64748b" }}>Timeline</p>
              <div className="space-y-2">
                {[
                  { label: "Created", time: selectedTrip.createdAt, done: true },
                  { label: "Dispatched", time: selectedTrip.dispatchedAt, done: !!selectedTrip.dispatchedAt },
                  { label: "Completed", time: selectedTrip.completedAt, done: !!selectedTrip.completedAt },
                ].map((step) => (
                  <div key={step.label} className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: step.done ? "#22c55e" : "#e2e8f0" }} />
                    <div>
                      <p className="text-xs font-medium" style={{ color: step.done ? "#0f172a" : "#94a3b8" }}>{step.label}</p>
                      {step.time && <p className="text-xs" style={{ color: "#94a3b8" }}>{formatDateTime(step.time)}</p>}
                    </div>
                  </div>
                ))}
                {selectedTrip.status === "CANCELLED" && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#ef4444" }} />
                    <p className="text-xs font-medium text-red-500">Cancelled</p>
                  </div>
                )}
              </div>
            </div>

            {/* Trip Details */}
            <div className="px-5 py-4 space-y-4">
              {[
                { label: "Vehicle", value: `${selectedTrip.vehicle.name} (${selectedTrip.vehicle.registrationNumber})` },
                { label: "Driver", value: selectedTrip.driver.name },
                { label: "Cargo Weight", value: `${selectedTrip.cargoWeight}T` },
                { label: "Capacity Utilization", value: `${Math.round((selectedTrip.cargoWeight / selectedTrip.vehicle.maximumLoadCapacity) * 100)}%` },
                { label: "Planned Distance", value: `${selectedTrip.plannedDistance} km` },
                { label: "Actual Distance", value: selectedTrip.actualDistance ? `${selectedTrip.actualDistance} km` : "—" },
                { label: "Initial Odometer", value: `${selectedTrip.initialOdometer.toLocaleString("en-IN")} km` },
                { label: "Final Odometer", value: selectedTrip.finalOdometer ? `${selectedTrip.finalOdometer.toLocaleString("en-IN")} km` : "—" },
                { label: "Revenue", value: formatCurrency(selectedTrip.revenue) },
                { label: "Fuel Consumed", value: selectedTrip.fuelConsumed ? `${selectedTrip.fuelConsumed}L` : "—" },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs" style={{ color: "#94a3b8" }}>{item.label}</p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: "#0f172a" }}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Actions in drawer */}
            {["DRAFT", "DISPATCHED"].includes(selectedTrip.status) && (
              <div className="px-5 py-4 flex gap-2" style={{ borderTop: "1px solid #f1f5f9" }}>
                {selectedTrip.status === "DRAFT" && (
                  <button onClick={() => { setSelectedTrip(null); setDispatchId(selectedTrip.id); }} className="flex-1 py-2 rounded-lg text-xs font-medium text-white" style={{ background: "#2563eb" }}>Dispatch</button>
                )}
                {selectedTrip.status === "DISPATCHED" && (
                  <button onClick={() => { setSelectedTrip(null); setShowCompleteForm(selectedTrip.id); }} className="flex-1 py-2 rounded-lg text-xs font-medium text-white" style={{ background: "#16a34a" }}>Complete</button>
                )}
                <button onClick={() => { setSelectedTrip(null); setCancelId(selectedTrip.id); }} className="flex-1 py-2 rounded-lg text-xs font-medium text-white" style={{ background: "#dc2626" }}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!dispatchId}
        title="Dispatch Trip"
        description="The vehicle and driver status will be set to ON_TRIP. All eligibility rules will be re-validated server-side."
        confirmLabel="Dispatch"
        variant="default"
        onConfirm={() => handleAction(dispatchId!, "dispatch")}
        onCancel={() => setDispatchId(null)}
      />

      <ConfirmDialog
        open={!!cancelId}
        title="Cancel Trip"
        description="If dispatched, the vehicle and driver will be restored to AVAILABLE. This cannot be undone."
        confirmLabel="Cancel Trip"
        variant="danger"
        onConfirm={() => handleAction(cancelId!, "cancel")}
        onCancel={() => setCancelId(null)}
      />
    </div>
  );
}
