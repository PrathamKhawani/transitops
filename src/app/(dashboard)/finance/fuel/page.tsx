"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, X, Fuel } from "lucide-react";
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
  const [form, setForm] = useState({
    vehicleId: "", tripId: "", liters: "", cost: "",
    date: new Date().toISOString().split("T")[0], odometerReading: "",
  });

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
    const res = await fetch("/api/fuel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error);
    else { toast.success("Fuel log recorded successfully"); setShowForm(false); fetchLogs(); }
    setSubmitting(false);
  }

  const totalLitres = logs.reduce((s, l) => s + l.liters, 0);
  const totalCost = logs.reduce((s, l) => s + l.cost, 0);
  const avgCostPerLitre = totalLitres > 0 ? totalCost / totalLitres : 0;

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: "date", label: "Date", sortable: true,
      render: (v) => <span style={{ fontWeight: 500, color: "#3F3F46" }}>{formatDate(v as string)}</span>,
    },
    {
      key: "vehicle", label: "Vehicle",
      render: (v) => (
        <div>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: "#09090B" }}>
            {(v as { name: string }).name}
          </p>
          <p style={{ fontSize: 11, color: "#A1A1AA", marginTop: 1, fontFamily: "monospace" }}>
            {(v as { registrationNumber: string }).registrationNumber}
          </p>
        </div>
      ),
    },
    {
      key: "trip", label: "Trip",
      render: (v) => (v as { tripCode: string } | null)?.tripCode
        ? <span className="chip chip-blue" style={{ fontFamily: "monospace" }}>{(v as { tripCode: string }).tripCode}</span>
        : <span style={{ color: "#A1A1AA" }}>—</span>,
    },
    {
      key: "liters", label: "Litres",
      render: (v) => (
        <span style={{ fontWeight: 600, color: "#09090B" }}>{Number(v).toFixed(1)}L</span>
      ),
    },
    {
      key: "cost", label: "Cost", sortable: true,
      render: (v) => <span style={{ fontWeight: 700, color: "#09090B" }}>{formatCurrency(v as number)}</span>,
    },
    {
      key: "odometerReading", label: "Odometer",
      render: (v) => (
        <span style={{ fontFamily: "monospace", color: "#3F3F46" }}>
          {(v as number).toLocaleString("en-IN")} km
        </span>
      ),
    },
  ];

  return (
    <div style={{ padding: "36px 44px" }}>
      <PageHeader
        title="Fuel Logs"
        description="Record, monitor, and analyse vehicle fuel consumption across the fleet"
        breadcrumb="Financial Analyst"
        actions={
          <button onClick={() => setShowForm(true)} className="btn btn-primary btn-lg">
            <Plus className="w-4 h-4" /> Log Fuel Fill-Up
          </button>
        }
      />

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Records", value: `${logs.length}`, sub: "Fill-up entries", accent: "#3B82F6" },
          { label: "Total Litres", value: `${totalLitres.toFixed(0)}L`, sub: "Fleet consumption", accent: "#F97316" },
          { label: "Total Fuel Cost", value: formatCurrency(totalCost), sub: `₹${avgCostPerLitre.toFixed(1)}/litre avg`, accent: "#10B981" },
        ].map(({ label, value, sub, accent }) => (
          <div key={label} className="card" style={{ padding: "18px 20px", borderLeft: `3px solid ${accent}` }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              {label}
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#18181B", letterSpacing: "-0.03em", lineHeight: 1 }}>
              {value}
            </p>
            <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>{sub}</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={logs as unknown as Record<string, unknown>[]}
        loading={loading}
        searchPlaceholder="Search fuel logs by vehicle or trip..."
      />

      {/* Add Fuel Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-box modal-box-lg">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Record Fuel Fill-Up</h3>
                <p style={{ fontSize: 12, color: "#71717A", marginTop: 2 }}>Log fuel consumption for a vehicle</p>
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                    Vehicle *
                  </label>
                  <select
                    required
                    value={form.vehicleId}
                    onChange={(e) => setForm({ ...form, vehicleId: e.target.value, tripId: "" })}
                    className="input-field"
                  >
                    <option value="">Select vehicle...</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                    Trip (optional — select for active dispatch trips)
                  </label>
                  <select
                    value={form.tripId}
                    onChange={(e) => setForm({ ...form, tripId: e.target.value })}
                    className="input-field"
                  >
                    <option value="">No trip</option>
                    {filteredTrips.map(t => (
                      <option key={t.id} value={t.id}>{t.tripCode}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Litres Filled *
                    </label>
                    <input
                      required
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="45.0"
                      value={form.liters}
                      onChange={(e) => setForm({ ...form, liters: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Total Cost (₹) *
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      placeholder="4275"
                      value={form.cost}
                      onChange={(e) => setForm({ ...form, cost: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Odometer Reading (km) *
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      placeholder="48200"
                      value={form.odometerReading}
                      onChange={(e) => setForm({ ...form, odometerReading: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Fill-Up Date *
                    </label>
                    <input
                      required
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  <Fuel className="w-3.5 h-3.5" />
                  {submitting ? "Saving..." : "Record Fuel Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
