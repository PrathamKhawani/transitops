import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { FleetFilters } from "@/components/shared/FleetFilters";
import { OperationsControlCenter, OpsAlert } from "@/components/shared/OperationsControlCenter";
import { formatDate } from "@/lib/utils";

const STATUS_META: Record<string, { color: string; bg: string; label: string; dot: string }> = {
  AVAILABLE: { color: "#16a34a", bg: "#f0fdf4", label: "Available", dot: "#22c55e" },
  ON_TRIP: { color: "#2563eb", bg: "#eff6ff", label: "On Trip", dot: "#3b82f6" },
  IN_SHOP: { color: "#d97706", bg: "#fffbeb", label: "In Shop", dot: "#f59e0b" },
  RETIRED: { color: "#94a3b8", bg: "#f8fafc", label: "Retired", dot: "#cbd5e1" },
};

export default async function FleetDashboard(
  { searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }
) {
  const session = await requireAuth();
  if (!session || session.role !== "FLEET_MANAGER") redirect("/login");

  const params = await searchParams;
  const where: Record<string, unknown> = {};
  if (params.type) where.type = params.type;
  if (params.status) where.status = params.status;
  if (params.region) where.region = params.region;

  const [
    totalVehicles, availableVehicles, onTripVehicles, inShopVehicles, retiredVehicles,
    activeTrips, draftTrips, availableDrivers, onTripDrivers,
    recentTrips, maintenanceAttention, recentVehicles,
    expiredDrivers, suspendedDrivers, invalidTrips, expiringDrivers,
    allCompletedTrips, allFuel, allMaint, allVehs, longMaint
  ] = await Promise.all([
    prisma.vehicle.count({ where: { ...where, status: where.status ? where.status : { not: "RETIRED" } } }),
    prisma.vehicle.count({ where: { ...where, status: "AVAILABLE" } }),
    prisma.vehicle.count({ where: { ...where, status: "ON_TRIP" } }),
    prisma.vehicle.count({ where: { ...where, status: "IN_SHOP" } }),
    prisma.vehicle.count({ where: { ...where, status: "RETIRED" } }),
    prisma.trip.count({ where: { status: "DISPATCHED" } }),
    prisma.trip.count({ where: { status: "DRAFT" } }),
    prisma.driver.count({ where: { status: "AVAILABLE" } }),
    prisma.driver.count({ where: { status: "ON_TRIP" } }),
    prisma.trip.findMany({
      where: { status: { in: ["DISPATCHED", "COMPLETED", "DRAFT"] } },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { vehicle: { select: { name: true } }, driver: { select: { name: true } } },
    }),
    prisma.vehicle.findMany({
      where: { ...where, maintenanceLogs: { some: { status: "IN_PROGRESS" } } },
      include: { maintenanceLogs: { where: { status: "IN_PROGRESS" }, orderBy: { startDate: "asc" }, take: 1, select: { description: true, startDate: true, cost: true } } },
      take: 5,
    }),
    prisma.vehicle.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, name: true, registrationNumber: true, type: true, status: true, region: true },
    }),
    prisma.driver.findMany({ where: { licenseExpiryDate: { lt: new Date() } } }),
    prisma.driver.findMany({ where: { status: "SUSPENDED" } }),
    prisma.trip.findMany({ where: { status: "DISPATCHED" }, include: { vehicle: true, driver: true } }),
    prisma.driver.findMany({ where: { licenseExpiryDate: { gte: new Date(), lte: new Date(Date.now() + 30 * 24 * 3600000) } } }),
    prisma.trip.findMany({ where: { status: "COMPLETED" }, select: { vehicleId: true, revenue: true } }),
    prisma.fuelLog.findMany({ select: { vehicleId: true, cost: true } }),
    prisma.maintenanceLog.findMany({ select: { vehicleId: true, cost: true } }),
    prisma.vehicle.findMany({ select: { id: true, acquisitionCost: true, name: true } }),
    prisma.maintenanceLog.findMany({ where: { status: "IN_PROGRESS", startDate: { lt: new Date(Date.now() - 3 * 24 * 3600000) } }, include: { vehicle: true } })
  ]);

  const fleetUtilization = totalVehicles > 0 ? Math.round((onTripVehicles / totalVehicles) * 100) : 0;
  const totalDrivers = availableDrivers + onTripDrivers;
  const allVehiclesCount = availableVehicles + onTripVehicles + inShopVehicles + retiredVehicles;

  const statusCounts = [
    { status: "AVAILABLE", count: availableVehicles },
    { status: "ON_TRIP", count: onTripVehicles },
    { status: "IN_SHOP", count: inShopVehicles },
    { status: "RETIRED", count: retiredVehicles },
  ];

  // Compute OCC Alerts
  const alerts: OpsAlert[] = [];
  expiredDrivers.forEach(d => alerts.push({ id: `exp-drv-${d.id}`, severity: "CRITICAL", title: "Expired Driver License", reason: "License has expired.", entity: d.name, href: "/safety/compliance" }));
  suspendedDrivers.forEach(d => alerts.push({ id: `susp-drv-${d.id}`, severity: "CRITICAL", title: "Suspended Driver", reason: "Driver is currently suspended.", entity: d.name, href: "/safety/compliance" }));
  invalidTrips.forEach(t => {
    if (t.vehicle.status === "IN_SHOP" || t.vehicle.status === "RETIRED") {
      alerts.push({ id: `inv-veh-${t.id}`, severity: "CRITICAL", title: "Invalid Dispatch State", reason: `Dispatched vehicle is ${t.vehicle.status.replace("_", " ")}.`, entity: t.tripCode, href: `/fleet/vehicles` });
    }
    if (t.driver.status === "SUSPENDED" || (t.driver.licenseExpiryDate && t.driver.licenseExpiryDate < new Date())) {
      alerts.push({ id: `inv-drv-${t.id}`, severity: "CRITICAL", title: "Invalid Dispatch State", reason: "Dispatched driver is non-compliant.", entity: t.tripCode, href: `/safety/compliance` });
    }
  });
  expiringDrivers.forEach(d => alerts.push({ id: `exprng-drv-${d.id}`, severity: "WARNING", title: "License Expiring Soon", reason: "License expires within 30 days.", entity: d.name, href: "/safety/compliance" }));
  longMaint.forEach(m => alerts.push({ id: `lng-mnt-${m.id}`, severity: "WARNING", title: "Long-Running Maintenance", reason: "Vehicle in shop > 3 days.", entity: m.vehicle.name, href: "/fleet" }));

  const roiMap = new Map<string, { acq: number, name: string, net: number }>();
  allVehs.forEach(v => roiMap.set(v.id, { acq: v.acquisitionCost, name: v.name, net: 0 }));
  allCompletedTrips.forEach(t => { const d = roiMap.get(t.vehicleId); if (d) d.net += t.revenue; });
  allFuel.forEach(f => { const d = roiMap.get(f.vehicleId); if (d) d.net -= f.cost; });
  allMaint.forEach(m => { const d = roiMap.get(m.vehicleId); if (d) d.net -= m.cost; });
  roiMap.forEach((val, id) => {
    if (val.acq > 0) {
      if (((val.net / val.acq) * 100) < 0) alerts.push({ id: `neg-roi-${id}`, severity: "WARNING", title: "Negative Vehicle ROI", reason: "Maintenance and fuel exceed revenue.", entity: val.name, href: "/finance/analytics" });
    }
  });

  if (availableVehicles > 0) alerts.push({ id: `avail-veh`, severity: "INFO", title: "Vehicles Available", reason: `${availableVehicles} vehicles ready for dispatch.`, entity: "Fleet", href: "/dispatch/smart-dispatch" });
  if (fleetUtilization >= 75) alerts.push({ id: `hlth-util`, severity: "INFO", title: "Healthy Fleet Utilization", reason: `Utilization is at an optimal ${fleetUtilization}%.`, entity: "Fleet", href: "/finance/analytics" });

  const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

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
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f2d4a 100%)",
        }}
      >
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle, #3b82f6, transparent)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-1/2 w-64 h-64 rounded-full opacity-5 pointer-events-none" style={{ background: "radial-gradient(circle, #60a5fa, transparent)", transform: "translate(-50%, 50%)" }} />

        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: "rgba(59,130,246,0.2)", color: "#60a5fa" }}>Fleet Manager</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Fleet Operations</h1>
          <p className="text-sm" style={{ color: "#94a3b8" }}>Live vehicle status, utilization and operational health</p>
        </div>

        {/* KPI Hero Bar */}
        <div className="relative mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Vehicles", value: totalVehicles, sub: "Excluding retired", color: "#3b82f6", glow: "#3b82f620" },
            { label: "Available Now", value: availableVehicles, sub: "Ready to dispatch", color: "#22c55e", glow: "#22c55e20" },
            { label: "In Maintenance", value: inShopVehicles, sub: "Currently in shop", color: "#f97316", glow: "#f9731620" },
            { label: "Fleet Utilization", value: `${fleetUtilization}%`, sub: `${onTripVehicles} on active trips`, color: "#a78bfa", glow: "#a78bfa20" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>{kpi.label}</span>
                <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: kpi.color, boxShadow: `0 0 8px ${kpi.color}` }} />
              </div>
              <p className="text-3xl font-extrabold text-white">{kpi.value}</p>
              <p className="text-xs mt-1" style={{ color: "#64748b" }}>{kpi.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-6 space-y-5">
        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Trips", value: activeTrips, sub: "Currently dispatched", accent: "#0891b2" },
            { label: "Pending Trips", value: draftTrips, sub: "Awaiting dispatch", accent: "#b45309" },
            { label: "Drivers On Duty", value: onTripDrivers, sub: `${availableDrivers} available`, accent: "#15803d" },
            { label: "Total Drivers", value: totalDrivers, sub: "Active roster", accent: "#7c3aed" },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-2xl p-4" style={{ border: `1px solid #e2e8f0`, borderLeft: `4px solid ${card.accent}` }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748b" }}>{card.label}</p>
              <p className="text-2xl font-bold" style={{ color: "#0f172a" }}>{card.value}</p>
              <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>{card.sub}</p>
            </div>
          ))}
        </div>

        <FleetFilters />

        {/* OCC */}
        <OperationsControlCenter alerts={alerts} />

        {/* Bottom Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Vehicle Status Breakdown */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <div>
                <p className="text-sm font-bold text-slate-900">Status Breakdown</p>
                <p className="text-xs text-slate-400 mt-0.5">Fleet distribution</p>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{allVehiclesCount} total</span>
            </div>
            <div className="p-5 space-y-4">
              {statusCounts.map(({ status, count }) => {
                const meta = STATUS_META[status] ?? { color: "#94a3b8", bg: "#f8fafc", label: status, dot: "#94a3b8" };
                const pct = allVehiclesCount > 0 ? Math.round((count / allVehiclesCount) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: meta.dot }} />
                        <span className="text-sm font-medium text-slate-700">{meta.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{count}</span>
                        <span className="text-xs text-slate-400">({pct}%)</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-2 rounded-full transition-all duration-700" style={{ background: meta.color, width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 pb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Recent Vehicles</p>
              <div className="space-y-2">
                {recentVehicles.slice(0, 5).map(v => {
                  const meta = STATUS_META[v.status] ?? STATUS_META.RETIRED;
                  return (
                    <div key={v.id} className="flex items-center justify-between py-1.5 px-3 rounded-xl" style={{ background: "#fafafa" }}>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{v.name}</p>
                        <p className="text-xs text-slate-400">{v.registrationNumber} · {v.region}</p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Maintenance Attention */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <div>
                <p className="text-sm font-bold text-slate-900">Maintenance Attention</p>
                <p className="text-xs text-slate-400 mt-0.5">Vehicles in shop</p>
              </div>
              {inShopVehicles > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "#fff7ed", color: "#ea580c" }}>{inShopVehicles} in shop</span>
              )}
            </div>
            <div className="divide-y divide-slate-50">
              {maintenanceAttention.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">✅</span>
                  </div>
                  <p className="text-sm font-semibold text-green-600">All Clear</p>
                  <p className="text-xs text-slate-400 mt-1">No active maintenance issues</p>
                </div>
              ) : (
                maintenanceAttention.map(v => {
                  const log = v.maintenanceLogs[0];
                  return (
                    <div key={v.id} className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fff7ed" }}>
                          <span className="text-sm">🔧</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{v.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{log?.description?.substring(0, 45) ?? "Maintenance in progress"}</p>
                          {log?.startDate && <p className="text-xs text-slate-400 mt-0.5">Since {formatDate(log.startDate)}</p>}
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "#fff7ed", color: "#ea580c" }}>IN SHOP</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Trip Activity */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <div>
                <p className="text-sm font-bold text-slate-900">Recent Trip Activity</p>
                <p className="text-xs text-slate-400 mt-0.5">Latest operations</p>
              </div>
              <a href="/fleet/vehicles" className="text-xs font-semibold text-blue-600 hover:text-blue-700">View fleet →</a>
            </div>
            <div className="divide-y divide-slate-50">
              {recentTrips.length === 0 ? (
                <p className="px-5 py-12 text-center text-sm text-slate-400">No recent trips</p>
              ) : (
                recentTrips.map(trip => {
                  const meta = tripStatusMeta[trip.status] ?? { color: "#94a3b8", bg: "#f8fafc", label: trip.status };
                  return (
                    <div key={trip.id} className="px-5 py-3.5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: meta.bg }}>
                        <span className="text-xs">📍</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{trip.source} → {trip.destination}</p>
                        <p className="text-xs text-slate-500 truncate">{trip.vehicle.name} · {trip.driver.name}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                        <p className="text-xs text-slate-400 mt-0.5">{trip.tripCode}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
