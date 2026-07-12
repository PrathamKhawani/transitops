"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { PageHeader } from "@/components/layout/AppHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { formatCurrency, formatDate } from "@/lib/utils";

interface FuelLog {
  id: string; liters: number; cost: number; date: string; odometerReading: number;
  vehicle: { name: string; registrationNumber: string };
  trip: { tripCode: string } | null;
}

interface Vehicle { id: string; name: string; registrationNumber: string; }
interface Trip { id: string; tripCode: string; vehicleId: string; }

export default function FuelPage() {
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ vehicleId: "", tripId: "", liters: "", cost: "", date: new Date().toISOString().split("T")[0], odometerReading: "" });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/fuel");
    setLogs(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => {
    fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : []));
    fetch("/api/trips?status=DISPATCHED").then(r => r.json()).then(d => setTrips(Array.isArray(d) ? d : []));
  }, []);

  const filteredTrips = form.vehicleId ? trips.filter(t => t.vehicleId === form.vehicleId) : trips;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const body: Record<string, unknown> = { ...form };
    if (!body.tripId) delete body.tripId;
    const res = await fetch("/api/fuel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) toast.error(data.error);
    else { toast.success("Fuel log recorded"); setShowForm(false); fetchLogs(); }
    setSubmitting(false);
  }

  // Summary stats
  const totalLitres = logs.reduce((s, l) => s + l.liters, 0);
  const totalCost = logs.reduce((s, l) => s + l.cost, 0);

  const columns: Column<Record<string, unknown>>[] = [
    { key: "date", label: "Date", sortable: true, render: (v) => formatDate(v as string) },
    { key: "vehicle", label: "Vehicle", render: (v) => `${(v as {name:string}).name} (${(v as {registrationNumber:string}).registrationNumber})` },
    { key: "trip", label: "Trip", render: (v) => (v as {tripCode:string} | null)?.tripCode || "—" },
    { key: "liters", label: "Litres", render: (v) => `${v}L` },
    { key: "cost", label: "Cost", render: (v) => formatCurrency(v as number) },
    { key: "odometerReading", label: "Odometer", render: (v) => `${(v as number).toLocaleString("en-IN")} km` },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Fuel Logs"
        description="Record and track fuel consumption"
        breadcrumb="Finance"
        actions={
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#2563eb" }}>
            <Plus className="w-4 h-4" /> Log Fuel
          </button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "Total Records", value: `${logs.length}` },
          { label: "Total Litres", value: `${totalLitres.toFixed(0)}L` },
          { label: "Total Fuel Cost", value: formatCurrency(totalCost) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <p className="text-xs" style={{ color: "#94a3b8" }}>{label}</p>
            <p className="text-lg font-bold mt-0.5" style={{ color: "#0f172a" }}>{value}</p>
          </div>
        ))}
      </div>

      <DataTable columns={columns} data={logs as unknown as Record<string, unknown>[]} loading={loading} searchPlaceholder="Search fuel logs..." />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4" style={{ border: "1px solid #e2e8f0" }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <h3 className="text-sm font-semibold" style={{ color: "#0f172a" }}>Record Fuel</h3>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Vehicle *</label>
                <select required value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value, tripId: "" })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }}>
                  <option value="">Select vehicle...</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Trip (optional)</label>
                <select value={form.tripId} onChange={(e) => setForm({ ...form, tripId: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }}>
                  <option value="">No trip</option>
                  {filteredTrips.map(t => <option key={t.id} value={t.id}>{t.tripCode}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Litres *", key: "liters", type: "number", step: "0.1", placeholder: "45" },
                  { label: "Cost (₹) *", key: "cost", type: "number", placeholder: "4275" },
                  { label: "Odometer (km) *", key: "odometerReading", type: "number", placeholder: "48200" },
                  { label: "Date *", key: "date", type: "date", placeholder: "" },
                ].map(({ label, key, type, step, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>{label}</label>
                    <input required type={type} step={step} placeholder={placeholder} value={(form as Record<string, string>)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#e2e8f0", color: "#374151" }}>Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: "#2563eb" }}>{submitting ? "Saving..." : "Record Fuel"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
