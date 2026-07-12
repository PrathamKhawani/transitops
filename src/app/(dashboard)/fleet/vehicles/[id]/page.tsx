"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Truck, Wrench, Fuel, Receipt } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/utils";

interface VehicleDetail {
  id: string; registrationNumber: string; name: string; model: string; type: string;
  maximumLoadCapacity: number; odometer: number; acquisitionCost: number; region: string; status: string;
  trips: Array<{ id: string; tripCode: string; source: string; destination: string; status: string; cargoWeight: number; revenue: number; dispatchedAt: string | null; completedAt: string | null; driver: { name: string } }>;
  maintenanceLogs: Array<{ id: string; type: string; description: string; cost: number; startDate: string; completedDate: string | null; status: string }>;
  fuelLogs: Array<{ id: string; liters: number; cost: number; date: string; odometerReading: number; trip: { tripCode: string } | null }>;
  expenses: Array<{ id: string; type: string; description: string; amount: number; date: string }>;
}

type Tab = "trips" | "maintenance" | "fuel" | "expenses";

export default function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("trips");

  useEffect(() => {
    fetch(`/api/vehicles/${id}`)
      .then(r => r.json())
      .then(d => { setVehicle(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-sm" style={{ color: "#64748b" }}>Loading vehicle details...</div>;
  if (!vehicle) return <div className="p-8 text-sm text-red-500">Vehicle not found</div>;

  const totalRevenue = vehicle.trips.filter(t => t.status === "COMPLETED").reduce((s, t) => s + t.revenue, 0);
  const totalExpenses = vehicle.expenses.reduce((s, e) => s + e.amount, 0) + vehicle.maintenanceLogs.reduce((s, m) => s + m.cost, 0);
  const totalFuelCost = vehicle.fuelLogs.reduce((s, f) => s + f.cost, 0);
  const completedTrips = vehicle.trips.filter(t => t.status === "COMPLETED").length;

  const TABS: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: "trips", label: "Trips", icon: <Truck className="w-3.5 h-3.5" />, count: vehicle.trips.length },
    { key: "maintenance", label: "Maintenance", icon: <Wrench className="w-3.5 h-3.5" />, count: vehicle.maintenanceLogs.length },
    { key: "fuel", label: "Fuel Logs", icon: <Fuel className="w-3.5 h-3.5" />, count: vehicle.fuelLogs.length },
    { key: "expenses", label: "Expenses", icon: <Receipt className="w-3.5 h-3.5" />, count: vehicle.expenses.length },
  ];

  return (
    <div className="p-6 max-w-5xl">
      {/* Back + Header */}
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs mb-5" style={{ color: "#64748b" }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Vehicles
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold" style={{ color: "#0f172a" }}>{vehicle.name}</h1>
            <StatusBadge status={vehicle.status} />
          </div>
          <p className="text-sm font-mono" style={{ color: "#64748b" }}>{vehicle.registrationNumber}</p>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>{vehicle.model} · {vehicle.type} · {vehicle.region}</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Max Capacity", value: `${vehicle.maximumLoadCapacity}T` },
          { label: "Odometer", value: `${formatNumber(vehicle.odometer)} km` },
          { label: "Total Revenue", value: formatCurrency(totalRevenue) },
          { label: "Total Expenses", value: formatCurrency(totalExpenses + totalFuelCost) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <p className="text-xs" style={{ color: "#94a3b8" }}>{label}</p>
            <p className="text-lg font-bold mt-0.5" style={{ color: "#0f172a" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 mb-4 rounded-lg p-1" style={{ background: "#f1f5f9" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              background: tab === t.key ? "#fff" : "transparent",
              color: tab === t.key ? "#0f172a" : "#64748b",
              boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {t.icon} {t.label} <span className="rounded-full px-1.5 text-xs" style={{ background: "#e2e8f0", color: "#64748b" }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "trips" && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
          {vehicle.trips.length === 0 ? <p className="p-6 text-sm text-center" style={{ color: "#94a3b8" }}>No trips yet</p> : (
            <table className="w-full text-sm">
              <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <tr>{["Trip Code","Route","Driver","Cargo","Revenue","Status","Date"].map(h => <th key={h} className="px-4 py-3 text-xs font-medium text-left" style={{ color: "#64748b" }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {vehicle.trips.map((t, i) => (
                  <tr key={t.id} style={{ borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "#475569" }}>{t.tripCode}</td>
                    <td className="px-4 py-3 text-xs">{t.source} → {t.destination}</td>
                    <td className="px-4 py-3 text-xs">{t.driver.name}</td>
                    <td className="px-4 py-3 text-xs">{t.cargoWeight}T</td>
                    <td className="px-4 py-3 text-xs">{formatCurrency(t.revenue)}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#94a3b8" }}>{formatDate(t.completedAt || t.dispatchedAt || "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "maintenance" && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
          {vehicle.maintenanceLogs.length === 0 ? <p className="p-6 text-sm text-center" style={{ color: "#94a3b8" }}>No maintenance logs</p> : (
            <table className="w-full text-sm">
              <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <tr>{["Type","Description","Cost","Start Date","Completed","Status"].map(h => <th key={h} className="px-4 py-3 text-xs font-medium text-left" style={{ color: "#64748b" }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {vehicle.maintenanceLogs.map((m, i) => (
                  <tr key={m.id} style={{ borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                    <td className="px-4 py-3 text-xs font-medium" style={{ color: "#0f172a" }}>{m.type}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#64748b", maxWidth: "200px" }}>{m.description}</td>
                    <td className="px-4 py-3 text-xs">{formatCurrency(m.cost)}</td>
                    <td className="px-4 py-3 text-xs">{formatDate(m.startDate)}</td>
                    <td className="px-4 py-3 text-xs">{m.completedDate ? formatDate(m.completedDate) : "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "fuel" && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
          {vehicle.fuelLogs.length === 0 ? <p className="p-6 text-sm text-center" style={{ color: "#94a3b8" }}>No fuel logs</p> : (
            <table className="w-full text-sm">
              <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <tr>{["Date","Litres","Cost","Odometer","Trip"].map(h => <th key={h} className="px-4 py-3 text-xs font-medium text-left" style={{ color: "#64748b" }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {vehicle.fuelLogs.map((f, i) => (
                  <tr key={f.id} style={{ borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                    <td className="px-4 py-3 text-xs">{formatDate(f.date)}</td>
                    <td className="px-4 py-3 text-xs">{f.liters}L</td>
                    <td className="px-4 py-3 text-xs">{formatCurrency(f.cost)}</td>
                    <td className="px-4 py-3 text-xs">{formatNumber(f.odometerReading)} km</td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: "#64748b" }}>{f.trip?.tripCode || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "expenses" && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
          {vehicle.expenses.length === 0 ? <p className="p-6 text-sm text-center" style={{ color: "#94a3b8" }}>No expenses</p> : (
            <table className="w-full text-sm">
              <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <tr>{["Date","Type","Description","Amount"].map(h => <th key={h} className="px-4 py-3 text-xs font-medium text-left" style={{ color: "#64748b" }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {vehicle.expenses.map((ex, i) => (
                  <tr key={ex.id} style={{ borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                    <td className="px-4 py-3 text-xs">{formatDate(ex.date)}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: "#f1f5f9", color: "#475569" }}>{ex.type}</span></td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>{ex.description}</td>
                    <td className="px-4 py-3 text-xs font-medium" style={{ color: "#0f172a" }}>{formatCurrency(ex.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
