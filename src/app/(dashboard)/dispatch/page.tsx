import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/utils";

export default async function DispatchDashboard() {
  const session = await requireAuth();
  if (!session || session.role !== "DISPATCHER") redirect("/login");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [activeTrips, draftTrips, availableVehicles, availableDrivers, completedToday, recentTrips] = await Promise.all([
    prisma.trip.count({ where: { status: "DISPATCHED" } }),
    prisma.trip.count({ where: { status: "DRAFT" } }),
    prisma.vehicle.count({ where: { status: "AVAILABLE" } }),
    prisma.driver.count({ where: { status: "AVAILABLE" } }),
    prisma.trip.count({ where: { status: "COMPLETED", completedAt: { gte: today } } }),
    prisma.trip.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: {
        vehicle: { select: { name: true, registrationNumber: true } },
        driver: { select: { name: true } },
      },
    }),
  ]);

  const tripStatusMeta: Record<string, { color: string; bg: string; label: string }> = {
    DISPATCHED: { color: "#2563eb", bg: "#eff6ff", label: "Dispatched" },
    COMPLETED: { color: "#16a34a", bg: "#f0fdf4", label: "Completed" },
    DRAFT: { color: "#64748b", bg: "#f8fafc", label: "Draft" },
    CANCELLED: { color: "#dc2626", bg: "#fef2f2", label: "Cancelled" },
  };

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      {/* Hero Header */}
      <div
        className="relative overflow-hidden px-6 pt-8 pb-10"
        style={{ background: "linear-gradient(135deg, #0a2540 0%, #1a4060 50%, #0d3254 100%)" }}
      >
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle, #10b981, transparent)", transform: "translate(20%, -20%)" }} />
        <div className="absolute bottom-0 left-1/3 w-56 h-56 rounded-full opacity-5 pointer-events-none" style={{ background: "radial-gradient(circle, #34d399, transparent)", transform: "translateY(50%)" }} />

        <div className="relative">
          <span className="text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full mb-3 inline-block" style={{ background: "rgba(16,185,129,0.2)", color: "#34d399" }}>Dispatcher</span>
          <h1 className="text-3xl font-bold text-white mb-1">Dispatch Command</h1>
          <p className="text-sm" style={{ color: "#94a3b8" }}>Manage and monitor all trip operations in real-time</p>
        </div>

        {/* KPI Hero Bar */}
        <div className="relative mt-8 grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Active Trips", value: activeTrips, color: "#3b82f6", emoji: "🚛" },
            { label: "Draft Trips", value: draftTrips, color: "#f59e0b", emoji: "📋" },
            { label: "Avail. Vehicles", value: availableVehicles, color: "#22c55e", emoji: "🚗" },
            { label: "Avail. Drivers", value: availableDrivers, color: "#a78bfa", emoji: "👤" },
            { label: "Completed Today", value: completedToday, color: "#06b6d4", emoji: "✅" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>{kpi.label}</span>
                <span className="text-base">{kpi.emoji}</span>
              </div>
              <p className="text-3xl font-extrabold text-white">{kpi.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-6 space-y-5">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Create New Trip", href: "/dispatch/trips", icon: "➕", color: "#3b82f6", bg: "#eff6ff" },
            { label: "Smart Dispatch", href: "/dispatch/smart-dispatch", icon: "⚡", color: "#7c3aed", bg: "#faf5ff" },
            { label: "View Vehicles", href: "/dispatch/vehicles", icon: "🚗", color: "#16a34a", bg: "#f0fdf4" },
            { label: "View Drivers", href: "/dispatch/drivers", icon: "👤", color: "#d97706", bg: "#fffbeb" },
          ].map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="flex items-center gap-3 bg-white rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ border: "1px solid #e2e8f0" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: action.bg }}>
                {action.icon}
              </div>
              <span className="text-sm font-semibold text-slate-800">{action.label}</span>
            </a>
          ))}
        </div>

        {/* Trips Table */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
          <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid #f1f5f9" }}>
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Trips</h2>
              <p className="text-xs text-slate-400 mt-0.5">All trip activity across the fleet</p>
            </div>
            <a href="/dispatch/trips" className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all trips <span>→</span>
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  {["Trip Code", "Route", "Vehicle", "Driver", "Status", "Date"].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTrips.map((trip, i) => {
                  const meta = tripStatusMeta[trip.status] ?? { color: "#94a3b8", bg: "#f8fafc", label: trip.status };
                  return (
                    <tr key={trip.id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: i < recentTrips.length - 1 ? "1px solid #f8fafc" : "none" }}>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{trip.tripCode}</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-800">{trip.source} → {trip.destination}</td>
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="text-sm text-slate-700">{trip.vehicle.name}</p>
                          <p className="text-xs text-slate-400">{trip.vehicle.registrationNumber}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-700">{trip.driver.name}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">{formatDate(trip.createdAt)}</td>
                    </tr>
                  );
                })}
                {recentTrips.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">No trips found. Create your first trip!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
