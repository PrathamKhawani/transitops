import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { FleetFilters } from "@/components/shared/FleetFilters";
import { OperationsControlCenter, OpsAlert } from "@/components/shared/OperationsControlCenter";
import { formatDate } from "@/lib/utils";

const STATUS_META: Record<string, { color: string; bg: string; label: string; dot: string; border: string }> = {
  AVAILABLE: { color: "#059669", bg: "#ECFDF5", label: "Available", dot: "#10B981", border: "#D1FAE5" },
  ON_TRIP:   { color: "#1D4ED8", bg: "#EFF6FF", label: "On Trip",   dot: "#3B82F6", border: "#DBEAFE" },
  IN_SHOP:   { color: "#B45309", bg: "#FFFBEB", label: "In Shop",   dot: "#F59E0B", border: "#FDE68A" },
  RETIRED:   { color: "#52525B", bg: "#F4F4F5", label: "Retired",   dot: "#A1A1AA", border: "#E4E4E7" },
};

export default async function FleetDashboard(
  { searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }
) {
  const session = await requireAuth();
  if (!session || session.role !== "FLEET_MANAGER") redirect("/login");

  const params = await searchParams;
  const where: Record<string, unknown> = {};
  if (params.type)   where.type   = params.type;
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
      orderBy: { updatedAt: "desc" }, take: 6,
      include: { vehicle: { select: { name: true } }, driver: { select: { name: true } } },
    }),
    prisma.vehicle.findMany({
      where: { ...where, maintenanceLogs: { some: { status: "IN_PROGRESS" } } },
      include: { maintenanceLogs: { where: { status: "IN_PROGRESS" }, orderBy: { startDate: "asc" }, take: 1, select: { description: true, startDate: true, cost: true } } },
      take: 5,
    }),
    prisma.vehicle.findMany({
      where, orderBy: { updatedAt: "desc" }, take: 8,
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
    { status: "ON_TRIP",   count: onTripVehicles },
    { status: "IN_SHOP",   count: inShopVehicles },
    { status: "RETIRED",   count: retiredVehicles },
  ];

  // Build OCC alerts
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

  const roiMap = new Map<string, { acq: number; name: string; net: number }>();
  allVehs.forEach(v => roiMap.set(v.id, { acq: v.acquisitionCost, name: v.name, net: 0 }));
  allCompletedTrips.forEach(t => { const d = roiMap.get(t.vehicleId); if (d) d.net += t.revenue; });
  allFuel.forEach(f => { const d = roiMap.get(f.vehicleId); if (d) d.net -= f.cost; });
  allMaint.forEach(m => { const d = roiMap.get(m.vehicleId); if (d) d.net -= m.cost; });
  roiMap.forEach((val, id) => {
    if (val.acq > 0 && (val.net / val.acq) * 100 < 0)
      alerts.push({ id: `neg-roi-${id}`, severity: "WARNING", title: "Negative Vehicle ROI", reason: "Maintenance and fuel exceed revenue.", entity: val.name, href: "/finance/analytics" });
  });

  if (availableVehicles > 0) alerts.push({ id: "avail-veh", severity: "INFO", title: "Vehicles Available", reason: `${availableVehicles} vehicles ready for dispatch.`, entity: "Fleet", href: "/dispatch/smart-dispatch" });
  if (fleetUtilization >= 75) alerts.push({ id: "hlth-util", severity: "INFO", title: "Healthy Fleet Utilization", reason: `Utilization is at an optimal ${fleetUtilization}%.`, entity: "Fleet", href: "/finance/analytics" });

  const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const tripStatusConfig: Record<string, { color: string; bg: string; label: string; dot: string; border: string }> = {
    DISPATCHED: { color: "#1D4ED8", bg: "#EFF6FF", label: "Dispatched", dot: "#3B82F6", border: "#DBEAFE" },
    COMPLETED:  { color: "#059669", bg: "#ECFDF5", label: "Completed",  dot: "#10B981", border: "#D1FAE5" },
    DRAFT:      { color: "#52525B", bg: "#F4F4F5", label: "Draft",      dot: "#A1A1AA", border: "#E4E4E7" },
    CANCELLED:  { color: "#DC2626", bg: "#FEF2F2", label: "Cancelled",  dot: "#EF4444", border: "#FEE2E2" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA" }}>

      {/* ═══ HEADER ═══ */}
      <div
        className="hero-banner"
        style={{ paddingBottom: 40 }}
      >
        {/* Subtle accent glow */}
        <div className="absolute pointer-events-none"
          style={{ top: -120, right: -80, width: 300, height: 300, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.12), transparent 70%)" }} />

        <div className="relative">
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#71717A",
                letterSpacing: "0.02em",
              }}
            >
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </span>
          </div>

          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: "#FFFFFF",
              letterSpacing: "-0.025em",
              lineHeight: 1.2,
              marginBottom: 4,
            }}
          >
            Fleet Overview
          </h1>
          <p style={{ fontSize: 14, color: "#71717A", letterSpacing: "-0.01em" }}>
            Vehicle status, utilization, and operations monitoring
          </p>
        </div>

        {/* Hero KPI Cards */}
        <div className="relative stagger" style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {[
            { label: "Active Vehicles",   value: totalVehicles,         sub: "Excluding retired",          color: "#3B82F6" },
            { label: "Available Now",      value: availableVehicles,     sub: "Ready to dispatch",          color: "#10B981" },
            { label: "In Maintenance",     value: inShopVehicles,        sub: "Currently in shop",          color: "#F59E0B" },
            { label: "Fleet Utilization",  value: `${fleetUtilization}%`, sub: `${onTripVehicles} on trips`, color: "#60A5FA" },
          ].map((kpi, i) => (
            <div
              key={kpi.label}
              className="card-glass animate-fade-in-up"
              style={{ padding: "22px 24px", animationDelay: `${i * 40}ms` }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#71717A",
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {kpi.label}
              </p>
              <p
                className="animate-count-up"
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                  animationDelay: `${i * 60}ms`,
                }}
              >
                {kpi.value}
              </p>
              <p style={{ fontSize: 12, marginTop: 6, color: "#52525B" }}>
                {kpi.sub}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div style={{ padding: "36px 44px", display: "flex", flexDirection: "column", gap: 28 }}>

        {/* Secondary KPIs */}
        <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {[
            { label: "Active Trips",    value: activeTrips,    sub: "Currently dispatched",          accent: "#3B82F6" },
            { label: "Pending Trips",   value: draftTrips,     sub: "Awaiting dispatch",              accent: "#F59E0B" },
            { label: "Drivers On Duty", value: onTripDrivers,  sub: `${availableDrivers} available`,  accent: "#10B981" },
            { label: "Total Drivers",   value: totalDrivers,   sub: "Active roster",                  accent: "#06B6D4" },
          ].map((card, i) => (
            <div
              key={card.label}
              className="card animate-fade-in-up"
              style={{
                padding: "20px 22px",
                borderLeft: `3px solid ${card.accent}`,
                animationDelay: `${i * 40}ms`,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#A1A1AA",
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {card.label}
              </p>
              <p
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#18181B",
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {card.value}
              </p>
              <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>
                {card.sub}
              </p>
            </div>
          ))}
        </div>

        <FleetFilters />

        {/* OCC */}
        <OperationsControlCenter alerts={alerts} />

        {/* Bottom 3-column Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>

          {/* Status Breakdown */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 24px",
                borderBottom: "1px solid #E4E4E7",
              }}
            >
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#18181B", letterSpacing: "-0.01em" }}>
                  Status Breakdown
                </p>
                <p style={{ fontSize: 12, marginTop: 2, color: "#A1A1AA" }}>
                  Fleet distribution
                </p>
              </div>
              <span className="chip chip-slate">
                {allVehiclesCount} total
              </span>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {statusCounts.map(({ status, count }) => {
                const meta = STATUS_META[status] ?? STATUS_META.RETIRED;
                const pct = allVehiclesCount > 0 ? Math.round((count / allVehiclesCount) * 100) : 0;
                return (
                  <div key={status}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: meta.dot }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#3F3F46" }}>
                          {meta.label}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#18181B" }}>{count}</span>
                        <span style={{ fontSize: 11, color: "#A1A1AA" }}>({pct}%)</span>
                      </div>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ background: meta.dot, width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent Vehicles */}
            <div style={{ padding: "0 24px 20px" }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#A1A1AA",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: 8,
                }}
              >
                Recent Vehicles
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {recentVehicles.slice(0, 5).map(v => {
                  const meta = STATUS_META[v.status] ?? STATUS_META.RETIRED;
                  return (
                    <div
                      key={v.id}
                      className="table-row-hover"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "11px 12px",
                        borderRadius: 8,
                      }}
                    >
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "#18181B" }}>
                          {v.name}
                        </p>
                        <p style={{ fontSize: 11, color: "#A1A1AA", marginTop: 1 }}>
                          {v.registrationNumber} · {v.region}
                        </p>
                      </div>
                      <span
                        className="chip"
                        style={{
                          fontSize: 10,
                          background: meta.bg,
                          color: meta.color,
                          border: `1px solid ${meta.border}`,
                          fontWeight: 500,
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Maintenance Attention */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 24px",
                borderBottom: "1px solid #E4E4E7",
              }}
            >
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#18181B", letterSpacing: "-0.01em" }}>
                  Maintenance
                </p>
                <p style={{ fontSize: 12, marginTop: 2, color: "#A1A1AA" }}>
                  Vehicles in shop
                </p>
              </div>
              {inShopVehicles > 0 && (
                <span className="chip chip-amber">
                  {inShopVehicles} in shop
                </span>
              )}
            </div>
            <div>
              {maintenanceAttention.length === 0 ? (
                <div style={{ padding: "48px 18px", textAlign: "center" }}>
                  <p style={{ fontSize: 20, marginBottom: 8 }}>✅</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#059669" }}>All Clear</p>
                  <p style={{ fontSize: 12, marginTop: 4, color: "#A1A1AA" }}>
                    No active maintenance issues
                  </p>
                </div>
              ) : (
                <div>
                  {maintenanceAttention.map(v => {
                    const log = v.maintenanceLogs[0];
                    return (
                      <div
                        key={v.id}
                        className="table-row-hover"
                        style={{ padding: "16px 24px", borderBottom: "1px solid #F4F4F5" }}
                      >
                        <div style={{ display: "flex", alignItems: "start", gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: "#FFFBEB",
                              border: "1px solid #FDE68A",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 14,
                              flexShrink: 0,
                            }}
                          >
                            🔧
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 500, color: "#18181B" }}>
                              {v.name}
                            </p>
                            <p style={{ fontSize: 12, marginTop: 2, color: "#71717A" }}>
                              {log?.description?.substring(0, 45) ?? "Maintenance in progress"}
                            </p>
                            {log?.startDate && (
                              <p style={{ fontSize: 11, marginTop: 2, color: "#A1A1AA" }}>
                                Since {formatDate(log.startDate)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Trip Activity */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 24px",
                borderBottom: "1px solid #E4E4E7",
              }}
            >
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#18181B", letterSpacing: "-0.01em" }}>
                  Recent Trips
                </p>
                <p style={{ fontSize: 12, marginTop: 2, color: "#A1A1AA" }}>
                  Latest operations
                </p>
              </div>
              <a href="/fleet/vehicles" className="btn btn-blue-soft btn-sm">
                View fleet →
              </a>
            </div>
            <div>
              {recentTrips.length === 0 ? (
                <p style={{ padding: "48px 18px", textAlign: "center", color: "#A1A1AA", fontSize: 13 }}>
                  No recent trips
                </p>
              ) : (
                recentTrips.map(trip => {
                  const meta = tripStatusConfig[trip.status] ?? tripStatusConfig.DRAFT;
                  return (
                    <div
                      key={trip.id}
                      className="table-row-hover"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "14px 24px",
                        borderBottom: "1px solid #F4F4F5",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "#18181B",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {trip.source} → {trip.destination}
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: "#A1A1AA",
                            marginTop: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {trip.vehicle.name} · {trip.driver.name}
                        </p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <span
                          className="chip"
                          style={{
                            fontSize: 10,
                            background: meta.bg,
                            color: meta.color,
                            border: `1px solid ${meta.border}`,
                            fontWeight: 500,
                          }}
                        >
                          {meta.label}
                        </span>
                        <p style={{ fontSize: 10, marginTop: 3, color: "#A1A1AA", fontFamily: "monospace" }}>
                          {trip.tripCode}
                        </p>
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
