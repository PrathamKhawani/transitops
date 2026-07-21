"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, X, Receipt, TrendingDown } from "lucide-react";
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

const TYPE_COLORS: Record<string, string> = {
  TOLL: "#3B82F6", PARKING: "#8B5CF6", MAINTENANCE: "#F59E0B",
  PERMIT: "#06B6D4", INSURANCE: "#10B981", OTHER: "#71717A",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    vehicleId: "", tripId: "", type: "TOLL", description: "",
    amount: "", date: new Date().toISOString().split("T")[0],
  });
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
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error);
    else { toast.success("Expense recorded successfully"); setShowForm(false); fetchExpenses(); }
    setSubmitting(false);
  }

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const byType: Record<string, number> = {};
  expenses.forEach(e => { byType[e.type] = (byType[e.type] || 0) + e.amount; });
  const topTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: "date", label: "Date", sortable: true,
      render: (v) => <span style={{ fontWeight: 500, color: "#3F3F46" }}>{formatDate(v as string)}</span>,
    },
    {
      key: "type", label: "Type",
      render: (v) => (
        <span className="chip" style={{
          background: `${TYPE_COLORS[v as string] || "#71717A"}15`,
          color: TYPE_COLORS[v as string] || "#71717A",
          border: `1px solid ${TYPE_COLORS[v as string] || "#71717A"}30`,
        }}>
          {v as string}
        </span>
      ),
    },
    {
      key: "description", label: "Description",
      render: (v) => <span style={{ color: "#3F3F46" }}>{String(v)}</span>,
    },
    {
      key: "vehicle", label: "Vehicle",
      render: (v) => (v as { name: string } | null)?.name
        ? <span style={{ fontWeight: 500, color: "#09090B" }}>{(v as { name: string }).name}</span>
        : <span style={{ color: "#A1A1AA" }}>—</span>,
    },
    {
      key: "trip", label: "Trip Ref",
      render: (v) => (v as { tripCode: string } | null)?.tripCode
        ? <span className="chip chip-blue" style={{ fontFamily: "monospace" }}>{(v as { tripCode: string }).tripCode}</span>
        : <span style={{ color: "#A1A1AA" }}>—</span>,
    },
    {
      key: "amount", label: "Amount", sortable: true,
      render: (v) => <span style={{ fontWeight: 700, color: "#09090B" }}>{formatCurrency(v as number)}</span>,
    },
  ];

  return (
    <div style={{ padding: "36px 44px" }}>
      <PageHeader
        title="Expenses"
        description="Track and manage all operational costs — tolls, permits, insurance, and more"
        breadcrumb="Financial Analyst"
        actions={
          <button onClick={() => setShowForm(true)} className="btn btn-primary btn-lg">
            <Plus className="w-4 h-4" /> Record Expense
          </button>
        }
      />

      {/* Summary Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 28 }}>
        <div className="card" style={{ padding: "18px 20px", borderLeft: "3px solid #EF4444" }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Total Expenses
          </p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#18181B", letterSpacing: "-0.03em", lineHeight: 1 }}>
            {formatCurrency(totalAmount)}
          </p>
          <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>{expenses.length} records</p>
        </div>
        {topTypes.map(([type, amount]) => (
          <div key={type} className="card" style={{ padding: "18px 20px", borderLeft: `3px solid ${TYPE_COLORS[type] || "#71717A"}` }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              {type}
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#18181B", letterSpacing: "-0.03em", lineHeight: 1 }}>
              {formatCurrency(amount)}
            </p>
            <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>
              {Math.round((amount / totalAmount) * 100)}% of total
            </p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={expenses as unknown as Record<string, unknown>[]}
        loading={loading}
        searchPlaceholder="Search expenses by type, description or vehicle..."
        filters={
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-field"
            style={{ width: "auto", minWidth: 150 }}
          >
            <option value="">All Types</option>
            {EXPENSE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        }
      />

      {/* Add Expense Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-box modal-box-lg">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Record New Expense</h3>
                <p style={{ fontSize: 12, color: "#71717A", marginTop: 2 }}>Log an operational cost entry</p>
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
                      Expense Type *
                    </label>
                    <select
                      required
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="input-field"
                    >
                      {EXPENSE_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Date *
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

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                    Amount (₹) *
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="1800"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                    Description *
                  </label>
                  <textarea
                    required
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    placeholder="Briefly describe this expense..."
                    className="input-field"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Vehicle (optional)
                    </label>
                    <select
                      value={form.vehicleId}
                      onChange={(e) => setForm({ ...form, vehicleId: e.target.value, tripId: "" })}
                      className="input-field"
                    >
                      <option value="">No vehicle</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Trip (optional)
                    </label>
                    <select
                      value={form.tripId}
                      onChange={(e) => setForm({ ...form, tripId: e.target.value })}
                      className="input-field"
                    >
                      <option value="">No trip</option>
                      {(form.vehicleId ? trips.filter(t => t.vehicleId === form.vehicleId) : trips).map(t => (
                        <option key={t.id} value={t.id}>{t.tripCode}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  <Receipt className="w-3.5 h-3.5" />
                  {submitting ? "Saving..." : "Record Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
