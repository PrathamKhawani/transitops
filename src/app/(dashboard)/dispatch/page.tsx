import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function DispatchDashboard() {
  const session = await requireAuth();
  if (!session || session.role !== "DISPATCHER") redirect("/login");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [activeTrips, draftTrips, availableVehicles, availableDrivers, completedToday, recentTrips] =
    await Promise.all([
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

  const statusConfig: Record<string, { color: string; bg: string; label: string; dot: string; border: string }> = {
    DISPATCHED: { color: "#1D4ED8", bg: "#EFF6FF", label: "Dispatched", dot: "#3B82F6", border: "#DBEAFE" },
    COMPLETED:  { color: "#059669", bg: "#ECFDF5", label: "Completed",  dot: "#10B981", border: "#D1FAE5" },
    DRAFT:      { color: "#52525B", bg: "#F4F4F5", label: "Draft",      dot: "#A1A1AA", border: "#E4E4E7" },
    CANCELLED:  { color: "#DC2626", bg: "#FEF2F2", label: "Cancelled",  dot: "#EF4444", border: "#FEE2E2" },
  };

  const kpis = [
    { label: "Active Trips",      value: activeTrips,       sub: "Currently dispatched", accent: "#3B82F6" },
    { label: "Draft Trips",       value: draftTrips,        sub: "Pending dispatch",      accent: "#F59E0B" },
    { label: "Vehicles Ready",    value: availableVehicles, sub: "Available to assign",   accent: "#10B981" },
    { label: "Drivers Available", value: availableDrivers,  sub: "On standby",            accent: "#06B6D4" },
    { label: "Completed Today",   value: completedToday,    sub: "Since midnight",        accent: "#8B5CF6" },
  ];

  const quickActions = [
    { label: "Create Trip",    href: "/dispatch/trips",         icon: "➕", color: "#3B82F6" },
    { label: "Smart Dispatch", href: "/dispatch/smart-dispatch", icon: "⚡", color: "#8B5CF6" },
    { label: "Vehicles",       href: "/dispatch/vehicles",       icon: "🚗", color: "#10B981" },
    { label: "Drivers",        href: "/dispatch/drivers",        icon: "👤", color: "#F59E0B" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA" }}>

      {/* ═══ HEADER ═══ */}
      <div className="hero-banner" style={{ paddingBottom: 40 }}>
        <div className="absolute pointer-events-none"
          style={{ top: -120, right: -60, width: 280, height: 280, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16,185,129,0.1), transparent 70%)" }} />

        <div className="relative">
          <p style={{ fontSize: 11, color: "#71717A", marginBottom: 20, letterSpacing: "0.02em" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: "#FFFFFF", letterSpacing: "-0.025em", lineHeight: 1.2, marginBottom: 4 }}>
            Dispatch Command
          </h1>
          <p style={{ fontSize: 14, color: "#71717A" }}>
            Monitor, assign and manage all trip operations
          </p>
        </div>

        {/* Hero KPIs */}
        <div className="relative stagger" style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {kpis.map((kpi, i) => (
            <div
              key={kpi.label}
              className="card-glass animate-fade-in-up"
              style={{ padding: "20px 18px", animationDelay: `${i * 40}ms` }}
            >
              <p style={{ fontSize: 10, fontWeight: 500, color: "#71717A", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>
                {kpi.label}
              </p>
              <p style={{ fontSize: 26, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.04em", lineHeight: 1 }}>
                {kpi.value}
              </p>
              <p style={{ fontSize: 11, marginTop: 6, color: "#52525B" }}>
                {kpi.sub}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div style={{ padding: "36px 44px", display: "flex", flexDirection: "column", gap: 28 }}>

        {/* Quick Actions */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
            Quick Actions
          </p>
          <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {quickActions.map((action, i) => (
              <a
                key={action.label}
                href={action.href}
                className="card animate-fade-in-up hover-action-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "18px 20px",
                  textDecoration: "none",
                  animationDelay: `${i * 40}ms`,
                  ["--hover-border" as any]: `${action.color}30`,
                  ["--hover-shadow" as any]: `0 4px 12px ${action.color}15`,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: `${action.color}10`,
                    border: `1px solid ${action.color}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {action.icon}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#18181B", letterSpacing: "-0.01em" }}>
                    {action.label}
                  </p>
                  <p style={{ fontSize: 11, color: "#A1A1AA", marginTop: 1 }}>Open →</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Recent Trips */}
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
              <p style={{ fontSize: 15, fontWeight: 600, color: "#18181B", letterSpacing: "-0.01em" }}>Recent Trips</p>
              <p style={{ fontSize: 12, marginTop: 2, color: "#A1A1AA" }}>Latest trip activity</p>
            </div>
            <a href="/dispatch/trips" className="btn btn-blue-soft btn-sm">
              View all →
            </a>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#FAFAFA", borderBottom: "1px solid #E4E4E7" }}>
                  {["Trip Code", "Route", "Vehicle", "Driver", "Status", "Date"].map(h => (
                    <th
                      key={h}
                      className="th-cell"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTrips.map((trip, i) => {
                  const meta = statusConfig[trip.status] ?? statusConfig.DRAFT;
                  return (
                    <tr
                      key={trip.id}
                      className="table-row-hover"
                      style={{ borderBottom: i < recentTrips.length - 1 ? "1px solid #F4F4F5" : "none" }}
                    >
                      <td className="td-cell">
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            fontFamily: "monospace",
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: "#F4F4F5",
                            color: "#3F3F46",
                            border: "1px solid #E4E4E7",
                          }}
                        >
                          {trip.tripCode}
                        </span>
                      </td>
                      <td className="td-cell">
                        <p style={{ fontSize: 14, fontWeight: 500, color: "#18181B" }}>
                          {trip.source} → {trip.destination}
                        </p>
                      </td>
                      <td className="td-cell">
                        <p style={{ fontSize: 13, color: "#3F3F46" }}>{trip.vehicle?.name ?? "—"}</p>
                        <p style={{ fontSize: 11, color: "#A1A1AA", marginTop: 2 }}>{trip.vehicle?.registrationNumber ?? "—"}</p>
                      </td>
                      <td className="td-cell">
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 6,
                              background: "#27272A",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#E4E4E7",
                              fontSize: 10,
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                          >
                            {trip.driver?.name?.charAt(0) ?? "—"}
                          </div>
                          <span style={{ fontSize: 13, color: "#3F3F46" }}>{trip.driver?.name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="td-cell">
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
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.dot, display: "inline-block" }} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="td-cell">
                        <p style={{ fontSize: 12, color: "#A1A1AA" }}>{formatDate(trip.createdAt)}</p>
                      </td>
                    </tr>
                  );
                })}
                {recentTrips.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: "56px 16px", textAlign: "center" }}>
                      <p style={{ fontSize: 13, color: "#A1A1AA" }}>No trips found. Create your first trip to get started.</p>
                    </td>
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
