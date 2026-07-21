"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Truck, Wrench, Fuel, Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/AppHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

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

  if (loading) {
    return (
      <div style={{ padding: "36px 44px" }}>
        <div className="skeleton" style={{ height: 120, width: "100%", marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 300, width: "100%" }} />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div style={{ padding: "36px 44px" }}>
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#DC2626" }}>Vehicle Not Found</p>
          <button onClick={() => router.push("/fleet/vehicles")} className="btn btn-ghost" style={{ marginTop: 16 }}>
            Back to Vehicles
          </button>
        </div>
      </div>
    );
  }

  const totalRevenue = vehicle.trips.filter(t => t.status === "COMPLETED").reduce((s, t) => s + t.revenue, 0);
  const totalExpenses = vehicle.expenses.reduce((s, e) => s + e.amount, 0) + vehicle.maintenanceLogs.reduce((s, m) => s + m.cost, 0);
  const totalFuelCost = vehicle.fuelLogs.reduce((s, f) => s + f.cost, 0);

  const TABS: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: "trips", label: "Trips", icon: <Truck className="w-3.5 h-3.5" />, count: vehicle.trips.length },
    { key: "maintenance", label: "Maintenance Orders", icon: <Wrench className="w-3.5 h-3.5" />, count: vehicle.maintenanceLogs.length },
    { key: "fuel", label: "Fuel Logs", icon: <Fuel className="w-3.5 h-3.5" />, count: vehicle.fuelLogs.length },
    { key: "expenses", label: "Other Expenses", icon: <Receipt className="w-3.5 h-3.5" />, count: vehicle.expenses.length },
  ];

  return (
    <div style={{ padding: "36px 44px", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Page Header with Back Button */}
      <div>
        <button
          onClick={() => router.back()}
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 16, display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Vehicles Roster
        </button>

        <PageHeader
          title={`${vehicle.name} (${vehicle.registrationNumber})`}
          description={`${vehicle.model} · ${vehicle.type} · Region: ${vehicle.region}`}
          breadcrumb="Fleet / Vehicles / Details"
          actions={<StatusBadge status={vehicle.status} />}
        />
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <div className="card" style={{ padding: "18px 20px", borderLeft: "3px solid #3B82F6" }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Max Load Capacity
          </p>
          <p style={{ fontSize: 24, fontWeight: 700, color: "#18181B", letterSpacing: "-0.03em", lineHeight: 1 }}>
            {vehicle.maximumLoadCapacity} Tons
          </p>
          <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>Acq. Cost: {formatCurrency(vehicle.acquisitionCost)}</p>
        </div>

        <div className="card" style={{ padding: "18px 20px", borderLeft: "3px solid #8B5CF6" }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Odometer Reading
          </p>
          <p style={{ fontSize: 24, fontWeight: 700, color: "#18181B", letterSpacing: "-0.03em", lineHeight: 1, fontFamily: "monospace" }}>
            {formatNumber(vehicle.odometer)} km
          </p>
          <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>Lifetime distance</p>
        </div>

        <div className="card" style={{ padding: "18px 20px", borderLeft: "3px solid #10B981" }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Total Revenue
          </p>
          <p style={{ fontSize: 24, fontWeight: 700, color: "#10B981", letterSpacing: "-0.03em", lineHeight: 1 }}>
            {formatCurrency(totalRevenue)}
          </p>
          <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>{vehicle.trips.filter(t => t.status === "COMPLETED").length} completed trips</p>
        </div>

        <div className="card" style={{ padding: "18px 20px", borderLeft: "3px solid #EF4444" }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Total Operating Cost
          </p>
          <p style={{ fontSize: 24, fontWeight: 700, color: "#18181B", letterSpacing: "-0.03em", lineHeight: 1 }}>
            {formatCurrency(totalExpenses + totalFuelCost)}
          </p>
          <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>Fuel + Maintenance + Expenses</p>
        </div>
      </div>

      {/* Tab Switcher Card */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid #E4E4E7", background: "#FAFAFA", display: "flex", gap: 8 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="btn"
              style={{
                background: tab === t.key ? "#18181B" : "transparent",
                color: tab === t.key ? "#FFFFFF" : "#52525B",
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 8,
              }}
            >
              {t.icon} {t.label}
              <span
                className="chip"
                style={{
                  marginLeft: 6,
                  background: tab === t.key ? "rgba(255,255,255,0.2)" : "#F4F4F5",
                  color: tab === t.key ? "#FFFFFF" : "#71717A",
                  padding: "1px 7px",
                  fontSize: 11,
                }}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ overflowX: "auto" }}>
          {tab === "trips" && (
            <table className="data-table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  {["Trip Code", "Route", "Driver", "Cargo Weight", "Revenue", "Status", "Date"].map(h => (
                    <th key={h} className="th-cell">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicle.trips.map(t => (
                  <tr key={t.id} className="table-row-hover">
                    <td className="td-cell" style={{ fontFamily: "monospace", color: "#3B82F6", fontWeight: 600 }}>{t.tripCode}</td>
                    <td className="td-cell" style={{ fontWeight: 500, color: "#09090B" }}>{t.source} → {t.destination}</td>
                    <td className="td-cell">{t.driver.name}</td>
                    <td className="td-cell">{t.cargoWeight}T</td>
                    <td className="td-cell" style={{ fontWeight: 600, color: "#10B981" }}>{formatCurrency(t.revenue)}</td>
                    <td className="td-cell"><StatusBadge status={t.status} /></td>
                    <td className="td-cell" style={{ color: "#71717A" }}>{formatDate(t.completedAt || t.dispatchedAt || "")}</td>
                  </tr>
                ))}
                {vehicle.trips.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: "48px 16px", textAlign: "center", color: "#A1A1AA" }}>No trips assigned to this vehicle yet</td></tr>
                )}
              </tbody>
            </table>
          )}

          {tab === "maintenance" && (
            <table className="data-table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  {["Service Type", "Description", "Cost", "Start Date", "Completed Date", "Status"].map(h => (
                    <th key={h} className="th-cell">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicle.maintenanceLogs.map(m => (
                  <tr key={m.id} className="table-row-hover">
                    <td className="td-cell"><span className="chip chip-blue" style={{ fontWeight: 500 }}>{m.type}</span></td>
                    <td className="td-cell" style={{ color: "#3F3F46" }}>{m.description}</td>
                    <td className="td-cell" style={{ fontWeight: 600, color: "#09090B" }}>{formatCurrency(m.cost)}</td>
                    <td className="td-cell">{formatDate(m.startDate)}</td>
                    <td className="td-cell">{m.completedDate ? formatDate(m.completedDate) : "—"}</td>
                    <td className="td-cell"><StatusBadge status={m.status} /></td>
                  </tr>
                ))}
                {vehicle.maintenanceLogs.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: "48px 16px", textAlign: "center", color: "#A1A1AA" }}>No maintenance logs recorded</td></tr>
                )}
              </tbody>
            </table>
          )}

          {tab === "fuel" && (
            <table className="data-table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  {["Fill-Up Date", "Litres", "Cost", "Odometer", "Trip Ref"].map(h => (
                    <th key={h} className="th-cell">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicle.fuelLogs.map(f => (
                  <tr key={f.id} className="table-row-hover">
                    <td className="td-cell" style={{ fontWeight: 500 }}>{formatDate(f.date)}</td>
                    <td className="td-cell" style={{ fontWeight: 600, color: "#09090B" }}>{f.liters}L</td>
                    <td className="td-cell" style={{ fontWeight: 600, color: "#F97316" }}>{formatCurrency(f.cost)}</td>
                    <td className="td-cell" style={{ fontFamily: "monospace" }}>{formatNumber(f.odometerReading)} km</td>
                    <td className="td-cell" style={{ fontFamily: "monospace", color: "#71717A" }}>{f.trip?.tripCode || "—"}</td>
                  </tr>
                ))}
                {vehicle.fuelLogs.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: "48px 16px", textAlign: "center", color: "#A1A1AA" }}>No fuel logs recorded</td></tr>
                )}
              </tbody>
            </table>
          )}

          {tab === "expenses" && (
            <table className="data-table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  {["Date", "Expense Type", "Description", "Amount"].map(h => (
                    <th key={h} className="th-cell">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicle.expenses.map(ex => (
                  <tr key={ex.id} className="table-row-hover">
                    <td className="td-cell">{formatDate(ex.date)}</td>
                    <td className="td-cell"><span className="chip chip-purple">{ex.type}</span></td>
                    <td className="td-cell" style={{ color: "#3F3F46" }}>{ex.description}</td>
                    <td className="td-cell" style={{ fontWeight: 600, color: "#09090B" }}>{formatCurrency(ex.amount)}</td>
                  </tr>
                ))}
                {vehicle.expenses.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: "48px 16px", textAlign: "center", color: "#A1A1AA" }}>No general expenses recorded</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
