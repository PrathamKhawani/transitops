import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/AppHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { FleetFilters } from "@/components/shared/FleetFilters";
import { OperationsControlCenter, OpsAlert } from "@/components/shared/OperationsControlCenter";
import { Car, CheckCircle, Wrench, MapPin, Clock, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  AVAILABLE: { color: "#16a34a", bg: "#f0fdf4", label: "Available" },
  ON_TRIP: { color: "#2563eb", bg: "#eff6ff", label: "On Trip" },
  IN_SHOP: { color: "#d97706", bg: "#fffbeb", label: "In Shop" },
  RETIRED: { color: "#94a3b8", bg: "#f8fafc", label: "Retired" },
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
      include: {
        vehicle: { select: { name: true } },
        driver: { select: { name: true } },
      },
    }),
    // Vehicles with IN_PROGRESS maintenance (need attention)
    prisma.vehicle.findMany({
      where: { ...where, maintenanceLogs: { some: { status: "IN_PROGRESS" } } },
      include: {
        maintenanceLogs: {
          where: { status: "IN_PROGRESS" },
          orderBy: { startDate: "asc" },
          take: 1,
          select: { description: true, startDate: true, cost: true },
        },
      },
      take: 5,
    }),
    // Recent vehicles for status overview
    prisma.vehicle.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, name: true, registrationNumber: true, type: true, status: true, region: true },
    }),
    // OCC Data
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

  const statusCounts = [
    { status: "AVAILABLE", count: availableVehicles },
    { status: "ON_TRIP", count: onTripVehicles },
    { status: "IN_SHOP", count: inShopVehicles },
    { status: "RETIRED", count: retiredVehicles },
  ];
  const allVehiclesCount = availableVehicles + onTripVehicles + inShopVehicles + retiredVehicles;

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

  return (
    <div className="p-6">
      <PageHeader
        title="Fleet Dashboard"
        description="Real-time overview of your fleet operations"
        breadcrumb="Fleet Manager"
      />

      <FleetFilters />

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KpiCard title="Active Vehicles" value={totalVehicles} subtitle="Excluding retired" icon={Car} iconColor="#2563eb" iconBg="#eff6ff" accent="#2563eb" />
        <KpiCard title="Available" value={availableVehicles} subtitle="Ready to dispatch" icon={CheckCircle} iconColor="#16a34a" iconBg="#f0fdf4" accent="#22c55e" />
        <KpiCard title="In Maintenance" value={inShopVehicles} subtitle="Currently in shop" icon={Wrench} iconColor="#ea580c" iconBg="#fff7ed" accent="#f97316" />
        <KpiCard title="Fleet Utilization" value={`${fleetUtilization}%`} subtitle={`${onTripVehicles} on active trips`} icon={TrendingUp} iconColor="#7c3aed" iconBg="#faf5ff" accent="#8b5cf6" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Active Trips" value={activeTrips} subtitle="Currently dispatched" icon={MapPin} iconColor="#0891b2" iconBg="#ecfeff" />
        <KpiCard title="Pending Trips" value={draftTrips} subtitle="Awaiting dispatch" icon={Clock} iconColor="#b45309" iconBg="#fffbeb" />
        <KpiCard title="Drivers On Duty" value={onTripDrivers} subtitle={`${availableDrivers} available`} icon={Users} iconColor="#15803d" iconBg="#f0fdf4" />
        <KpiCard title="Total Drivers" value={totalDrivers} subtitle="Active roster" icon={Users} iconColor="#475569" iconBg="#f8fafc" />
      </div>

      <div className="mb-6">
        <OperationsControlCenter alerts={alerts} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Vehicle Status Overview */}
        <div className="bg-white rounded-xl" style={{ border: "1px solid #e2e8f0" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
            <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Vehicle Status Overview</p>
          </div>
          <div className="p-5 space-y-3">
            {statusCounts.map(({ status, count }) => {
              const meta = STATUS_META[status] ?? { color: "#94a3b8", bg: "#f8fafc", label: status };
              const pct = allVehiclesCount > 0 ? Math.round((count / allVehiclesCount) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                      <span className="text-xs font-medium" style={{ color: "#374151" }}>{meta.label}</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: "#0f172a" }}>{count} <span style={{ color: "#94a3b8" }}>({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "#f1f5f9" }}>
                    <div className="h-1.5 rounded-full transition-all" style={{ background: meta.color, width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {/* Recent vehicles mini-list */}
          <div className="px-5 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#94a3b8" }}>Recent Vehicles</p>
            <div className="space-y-1.5">
              {recentVehicles.slice(0, 5).map(v => {
                const meta = STATUS_META[v.status] ?? STATUS_META.RETIRED;
                return (
                  <div key={v.id} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-xs font-medium" style={{ color: "#0f172a" }}>{v.name}</p>
                      <p className="text-xs" style={{ color: "#94a3b8" }}>{v.registrationNumber} · {v.region}</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Maintenance Attention */}
        <div className="bg-white rounded-xl" style={{ border: "1px solid #e2e8f0" }}>
          <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid #f1f5f9" }}>
            <AlertTriangle className="w-4 h-4" style={{ color: "#d97706" }} />
            <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Maintenance Attention</p>
            {inShopVehicles > 0 && (
              <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#fff7ed", color: "#ea580c" }}>
                {inShopVehicles} in shop
              </span>
            )}
          </div>
          <div className="divide-y" style={{ borderColor: "#f8fafc" }}>
            {maintenanceAttention.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: "#22c55e" }} />
                <p className="text-sm font-medium" style={{ color: "#16a34a" }}>No active maintenance</p>
                <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>All vehicles operational</p>
              </div>
            ) : (
              maintenanceAttention.map(v => {
                const log = v.maintenanceLogs[0];
                return (
                  <div key={v.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{v.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
                          {log?.description?.substring(0, 40) ?? "Maintenance in progress"}
                        </p>
                        {log?.startDate && (
                          <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                            Since {formatDate(log.startDate)}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded flex-shrink-0 ml-2" style={{ background: "#fff7ed", color: "#ea580c" }}>IN SHOP</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Trip Activity */}
        <div className="bg-white rounded-xl" style={{ border: "1px solid #e2e8f0" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
            <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Recent Trip Activity</p>
          </div>
          <div className="divide-y" style={{ borderColor: "#f8fafc" }}>
            {recentTrips.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm" style={{ color: "#94a3b8" }}>No recent trips</p>
            ) : (
              recentTrips.map(trip => {
                const statusMeta: Record<string, { color: string; bg: string }> = {
                  DISPATCHED: { color: "#2563eb", bg: "#eff6ff" },
                  COMPLETED: { color: "#16a34a", bg: "#f0fdf4" },
                  DRAFT: { color: "#64748b", bg: "#f8fafc" },
                };
                const meta = statusMeta[trip.status] ?? { color: "#94a3b8", bg: "#f8fafc" };
                return (
                  <div key={trip.id} className="px-5 py-3.5 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: meta.bg }}>
                      <MapPin className="w-3.5 h-3.5" style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#0f172a" }}>
                        {trip.source} → {trip.destination}
                      </p>
                      <p className="text-xs truncate" style={{ color: "#64748b" }}>
                        {trip.vehicle.name} · {trip.driver.name}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: meta.color, background: meta.bg }}>
                        {trip.status}
                      </span>
                      <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{trip.tripCode}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
