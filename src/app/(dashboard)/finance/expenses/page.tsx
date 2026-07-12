"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { PageHeader } from "@/components/layout/AppHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Expense {
  id: string; type: string; description: string; amount: number; date: string;
  vehicle: { name: string } | null;
  trip: { tripCode: string } | null;
}

interface Vehicle { id: string; name: string; registrationNumber: string; }

const EXPENSE_TYPES = ["TOLL", "PARKING", "MAINTENANCE", "PERMIT", "INSURANCE", "OTHER"];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ vehicleId: "", tripId: "", type: "TOLL", description: "", amount: "", date: new Date().toISOString().split("T")[0] });
  const [trips, setTrips] = useState<Array<{ id: string; tripCode: string; vehicleId: string }>>([]);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    const res = await fetch(`/api/expenses?${params}`);
    setExpenses(await res.json());
    setLoading(false);
  }, [typeFilter]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);
  useEffect(() => {
    fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : []));
    fetch("/api/trips").then(r => r.json()).then(d => setTrips(Array.isArray(d) ? d : []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const body: Record<string, unknown> = { ...form };
    if (!body.vehicleId) delete body.vehicleId;
    if (!body.tripId) delete body.tripId;
    const res = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) toast.error(data.error);
    else { toast.success("Expense recorded"); setShowForm(false); fetchExpenses(); }
    setSubmitting(false);
  }

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const byType: Record<string, number> = {};
  expenses.forEach(e => { byType[e.type] = (byType[e.type] || 0) + e.amount; });

  const columns: Column<Record<string, unknown>>[] = [
    { key: "date", label: "Date", sortable: true, render: (v) => formatDate(v as string) },
    { key: "type", label: "Type", render: (v) => <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: "#f1f5f9", color: "#475569" }}>{v as string}</span> },
    { key: "description", label: "Description" },
    { key: "vehicle", label: "Vehicle", render: (v) => (v as {name:string} | null)?.name || "—" },
    { key: "trip", label: "Trip", render: (v) => (v as {tripCode:string} | null)?.tripCode || "—" },
    { key: "amount", label: "Amount", sortable: true, render: (v) => formatCurrency(v as number) },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Expenses"
        description="Track operational costs and expenses"
        breadcrumb="Finance"
        actions={
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#2563eb" }}>
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <div className="rounded-xl p-4" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <p className="text-xs" style={{ color: "#94a3b8" }}>Total Expenses</p>
          <p className="text-lg font-bold mt-0.5" style={{ color: "#0f172a" }}>{formatCurrency(totalAmount)}</p>
        </div>
        {Object.entries(byType).slice(0, 3).map(([type, amount]) => (
          <div key={type} className="rounded-xl p-4" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <p className="text-xs" style={{ color: "#94a3b8" }}>{type}</p>
            <p className="text-lg font-bold mt-0.5" style={{ color: "#0f172a" }}>{formatCurrency(amount)}</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={expenses as unknown as Record<string, unknown>[]}
        loading={loading}
        searchPlaceholder="Search expenses..."
        filters={
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-xs border rounded-md px-2 py-1.5 outline-none" style={{ borderColor: "#e2e8f0", color: "#374151" }}>
            <option value="">All Types</option>
            {EXPENSE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        }
      />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4" style={{ border: "1px solid #e2e8f0" }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <h3 className="text-sm font-semibold" style={{ color: "#0f172a" }}>Record Expense</h3>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Type *</label>
                <select required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }}>
                  {EXPENSE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Description *</label>
                <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Amount (₹) *</label>
                  <input required type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="1800" className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Date *</label>
                  <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Vehicle (optional)</label>
                <select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value, tripId: "" })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }}>
                  <option value="">No vehicle</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Trip (optional)</label>
                <select value={form.tripId} onChange={(e) => setForm({ ...form, tripId: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }}>
                  <option value="">No trip</option>
                  {(form.vehicleId ? trips.filter(t => t.vehicleId === form.vehicleId) : trips).map(t => <option key={t.id} value={t.id}>{t.tripCode}</option>)}
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#e2e8f0", color: "#374151" }}>Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: "#2563eb" }}>{submitting ? "Saving..." : "Record Expense"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
