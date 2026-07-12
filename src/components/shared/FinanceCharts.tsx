"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
} from "recharts";

const INR = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

const SHORT_INR = (v: number) =>
  v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${v}`;

const PIE_COLORS: Record<string, string> = {
  AVAILABLE: "#22c55e",
  ON_TRIP: "#2563eb",
  IN_SHOP: "#f59e0b",
  RETIRED: "#94a3b8",
};

interface MonthlyData { month: string; revenue: number; fuelCost: number; }
interface FleetStatus { status: string; count: number; }
interface BarData { name: string; fuelCost?: number; maintenanceCost?: number; totalCost?: number; }

interface Props {
  monthlyChartData: MonthlyData[];
  fleetStatus: FleetStatus[];
  fuelByVehicle: BarData[];
  maintenanceByVehicle: BarData[];
  topCostliest: BarData[];
}

const TooltipStyle = {
  contentStyle: { background: "#1e293b", border: "none", borderRadius: "8px", color: "#f8fafc", fontSize: "12px" },
  labelStyle: { color: "#94a3b8", marginBottom: 4 },
};

export function FinanceCharts({ monthlyChartData, fleetStatus, fuelByVehicle, maintenanceByVehicle, topCostliest }: Props) {
  return (
    <div className="space-y-5">
      {/* Row 1: Monthly Revenue & Revenue vs Cost */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl p-5" style={{ border: "1px solid #e2e8f0" }}>
          <p className="text-sm font-semibold mb-4" style={{ color: "#0f172a" }}>Monthly Revenue (Last 12 Months)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={SHORT_INR} width={52} />
              <Tooltip {...TooltipStyle} formatter={(v: unknown) => [INR(Number(v)), "Revenue"]} />
              <Bar dataKey="revenue" fill="#2563eb" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-5" style={{ border: "1px solid #e2e8f0" }}>
          <p className="text-sm font-semibold mb-4" style={{ color: "#0f172a" }}>Revenue vs Fuel Cost</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={SHORT_INR} width={52} />
              <Tooltip {...TooltipStyle} formatter={(v: unknown, name: unknown) => [INR(Number(v)), String(name) === "revenue" ? "Revenue" : "Fuel Cost"]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} name="revenue" />
              <Line type="monotone" dataKey="fuelCost" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name="fuelCost" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Fleet Status Pie + Fuel Cost by Vehicle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl p-5" style={{ border: "1px solid #e2e8f0" }}>
          <p className="text-sm font-semibold mb-4" style={{ color: "#0f172a" }}>Fleet Status Distribution</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={170}>
              <PieChart>
                <Pie data={fleetStatus} dataKey="count" cx="50%" cy="50%" outerRadius={70} paddingAngle={3}>
                  {fleetStatus.map(entry => (
                    <Cell key={entry.status} fill={PIE_COLORS[entry.status] ?? "#e2e8f0"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TooltipStyle.contentStyle} formatter={(v: unknown, _: unknown, item: unknown) => { const p = item as { payload?: { status?: string } }; return [Number(v), p?.payload?.status ?? ""]; }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {fleetStatus.map(s => (
                <div key={s.status} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[s.status] ?? "#e2e8f0" }} />
                  <span className="text-xs" style={{ color: "#374151" }}>{s.status}</span>
                  <span className="text-xs font-bold ml-auto" style={{ color: "#0f172a" }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5" style={{ border: "1px solid #e2e8f0" }}>
          <p className="text-sm font-semibold mb-4" style={{ color: "#0f172a" }}>Fuel Cost by Vehicle</p>
          {fuelByVehicle.length > 0 ? (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={fuelByVehicle} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={SHORT_INR} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} width={80} />
                <Tooltip {...TooltipStyle} formatter={(v: unknown) => [INR(Number(v)), "Fuel Cost"]} />
                <Bar dataKey="fuelCost" fill="#f97316" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: "#94a3b8" }}>No fuel data available</p>
          )}
        </div>
      </div>

      {/* Row 3: Maintenance Cost + Top Costliest */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl p-5" style={{ border: "1px solid #e2e8f0" }}>
          <p className="text-sm font-semibold mb-4" style={{ color: "#0f172a" }}>Maintenance Cost by Vehicle</p>
          {maintenanceByVehicle.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={maintenanceByVehicle} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={SHORT_INR} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} width={80} />
                <Tooltip {...TooltipStyle} formatter={(v: unknown) => [INR(Number(v)), "Maintenance"]} />
                <Bar dataKey="maintenanceCost" fill="#f59e0b" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: "#94a3b8" }}>No maintenance data available</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-5" style={{ border: "1px solid #e2e8f0" }}>
          <p className="text-sm font-semibold mb-4" style={{ color: "#0f172a" }}>Top Costliest Vehicles</p>
          {topCostliest.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topCostliest} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={SHORT_INR} width={52} />
                <Tooltip {...TooltipStyle} formatter={(v: unknown, name: unknown) => { const n = String(name); return [INR(Number(v)), n === "fuelCost" ? "Fuel" : n === "maintenanceCost" ? "Maintenance" : "Total"]; }} />
                <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="fuelCost" fill="#f97316" stackId="a" name="fuelCost" />
                <Bar dataKey="maintenanceCost" fill="#f59e0b" stackId="a" radius={[3, 3, 0, 0]} name="maintenanceCost" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: "#94a3b8" }}>No cost data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
