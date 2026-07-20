import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/utils";

export default async function SafetyDashboard() {
  const session = await requireAuth();
  if (!session || session.role !== "SAFETY_OFFICER") redirect("/login");

  const today = new Date();
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [totalDrivers, validLicenses, expiringDrivers, expiredLicenses, suspendedDrivers, avgScoreData, lowScoreDrivers, allDrivers] = await Promise.all([
    prisma.driver.count(),
    prisma.driver.count({ where: { licenseExpiryDate: { gt: in30Days } } }),
    prisma.driver.count({ where: { licenseExpiryDate: { gt: today, lte: in30Days } } }),
    prisma.driver.count({ where: { licenseExpiryDate: { lte: today } } }),
    prisma.driver.count({ where: { status: "SUSPENDED" } }),
    prisma.driver.aggregate({ _avg: { safetyScore: true } }),
    prisma.driver.findMany({ where: { safetyScore: { lt: 80 } }, orderBy: { safetyScore: "asc" }, take: 5, select: { id: true, name: true, licenseNumber: true, licenseCategory: true, status: true, safetyScore: true } }),
    prisma.driver.findMany({
      orderBy: [{ status: "asc" }, { licenseExpiryDate: "asc" }],
      take: 6,
      select: { id: true, name: true, licenseNumber: true, licenseCategory: true, status: true, safetyScore: true, licenseExpiryDate: true },
    }),
  ]);

  const avgSafetyScore = Math.round(avgScoreData._avg.safetyScore || 0);
  const complianceRate = totalDrivers > 0 ? Math.round(((totalDrivers - expiredLicenses - suspendedDrivers) / totalDrivers) * 100) : 0;

  const getScoreColor = (score: number) => {
    if (score >= 90) return { color: "#059669", bg: "#ECFDF5" };
    if (score >= 80) return { color: "#3B82F6", bg: "#EFF6FF" };
    if (score >= 70) return { color: "#D97706", bg: "#FFFBEB" };
    return { color: "#DC2626", bg: "#FEF2F2" };
  };

  const scoreGrade = avgSafetyScore >= 90 ? "Excellent" : avgSafetyScore >= 80 ? "Good" : avgSafetyScore >= 70 ? "Fair" : "Critical";

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA" }}>

      {/* ═══ HEADER ═══ */}
      <div className="hero-banner" style={{ paddingBottom: 40 }}>
        <div className="absolute pointer-events-none"
          style={{ top: -100, right: -60, width: 280, height: 280, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(245,158,11,0.1), transparent 70%)" }} />

        <div className="relative">
          <p style={{ fontSize: 11, color: "#71717A", marginBottom: 20, letterSpacing: "0.02em" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: "#FFFFFF", letterSpacing: "-0.025em", lineHeight: 1.2, marginBottom: 4 }}>
            Safety Overview
          </h1>
          <p style={{ fontSize: 14, color: "#71717A" }}>
            Driver compliance, licensing and safety score monitoring
          </p>
        </div>

        {/* Hero KPIs */}
        <div className="relative stagger" style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "Total Drivers",    value: totalDrivers,   sub: "Across all routes",       color: "#60A5FA" },
            { label: "Valid Licenses",   value: validLicenses,  sub: "Compliant & active",       color: "#10B981" },
            { label: "Avg Safety Score", value: `${avgSafetyScore}`, sub: `${scoreGrade} performance`, color: avgSafetyScore >= 80 ? "#10B981" : "#F59E0B" },
          ].map((kpi, i) => (
            <div
              key={kpi.label}
              className="card-glass animate-fade-in-up"
              style={{ padding: "16px 18px", animationDelay: `${i * 50}ms` }}
            >
              <p style={{ fontSize: 11, fontWeight: 500, color: "#71717A", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                {kpi.label}
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <p style={{ fontSize: 28, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.04em", lineHeight: 1 }}>
                  {kpi.value}
                </p>
                {kpi.label === "Avg Safety Score" && (
                  <span style={{ fontSize: 13, color: "#52525B" }}>/100</span>
                )}
              </div>
              <p style={{ fontSize: 12, marginTop: 6, color: "#52525B" }}>{kpi.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Alert Stats */}
        <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Expiring (30d)",   value: expiringDrivers, accent: "#F59E0B", sub: "Renewal required soon" },
            { label: "Expired Licenses", value: expiredLicenses,  accent: "#EF4444", sub: "Immediate action needed" },
            { label: "Suspended",        value: suspendedDrivers, accent: "#DC2626", sub: "Currently suspended" },
            {
              label: "Compliance Rate",
              value: `${complianceRate}%`,
              accent: complianceRate >= 80 ? "#10B981" : "#DC2626",
              sub: "Active driver rate",
            },
          ].map((card, i) => (
            <div
              key={card.label}
              className="card animate-fade-in-up"
              style={{
                padding: "16px 18px",
                borderLeft: `3px solid ${card.accent}`,
                animationDelay: `${i * 40}ms`,
              }}
            >
              <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                {card.label}
              </p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#18181B", letterSpacing: "-0.03em", lineHeight: 1 }}>
                {card.value}
              </p>
              <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Main panels */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Low Safety Score */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                borderBottom: "1px solid #E4E4E7",
              }}
            >
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#18181B" }}>Low Safety Scores</p>
                <p style={{ fontSize: 12, marginTop: 2, color: "#A1A1AA" }}>Drivers scoring below 80/100</p>
              </div>
              {lowScoreDrivers.length > 0 && (
                <span className="chip chip-red" style={{ fontWeight: 600 }}>
                  {lowScoreDrivers.length} drivers
                </span>
              )}
            </div>
            <div>
              {lowScoreDrivers.length === 0 ? (
                <div style={{ padding: "48px 18px", textAlign: "center" }}>
                  <p style={{ fontSize: 20, marginBottom: 8 }}>🏆</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#059669" }}>Excellent Performance</p>
                  <p style={{ fontSize: 12, marginTop: 4, color: "#A1A1AA" }}>All drivers scoring 80+</p>
                </div>
              ) : (
                lowScoreDrivers.map(d => {
                  const sc = getScoreColor(d.safetyScore);
                  return (
                    <div
                      key={d.id}
                      className="table-row-hover"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 18px",
                        borderBottom: "1px solid #F4F4F5",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: sc.bg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 600,
                            color: sc.color,
                            flexShrink: 0,
                          }}
                        >
                          {d.name.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 500, color: "#18181B" }}>{d.name}</p>
                          <p style={{ fontSize: 11, color: "#A1A1AA", marginTop: 1 }}>{d.licenseNumber} · {d.licenseCategory}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <StatusBadge status={d.status} />
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 18, fontWeight: 700, color: sc.color }}>{d.safetyScore}</span>
                          <span style={{ fontSize: 11, color: "#A1A1AA" }}>/100</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Driver Status Overview */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                borderBottom: "1px solid #E4E4E7",
              }}
            >
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#18181B" }}>Driver Status</p>
                <p style={{ fontSize: 12, marginTop: 2, color: "#A1A1AA" }}>License & compliance status</p>
              </div>
              <a href="/safety/drivers" className="btn btn-blue-soft btn-sm">View all →</a>
            </div>
            <div>
              {allDrivers.map(d => {
                const isExpired = new Date(d.licenseExpiryDate) < today;
                const isExpiring = !isExpired && new Date(d.licenseExpiryDate) <= in30Days;
                const sc = getScoreColor(d.safetyScore);
                return (
                  <div
                    key={d.id}
                    className="table-row-hover"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "12px 18px",
                      borderBottom: "1px solid #F4F4F5",
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 7,
                        background: sc.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 600,
                        color: sc.color,
                        flexShrink: 0,
                      }}
                    >
                      {d.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "#18181B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {d.name}
                      </p>
                      <p style={{ fontSize: 11, marginTop: 1, color: "#A1A1AA" }}>
                        Expires: {formatDate(d.licenseExpiryDate)}
                        {isExpired && <span style={{ marginLeft: 4, fontWeight: 600, color: "#EF4444" }}>Expired</span>}
                        {isExpiring && <span style={{ marginLeft: 4, fontWeight: 600, color: "#F59E0B" }}>Expiring</span>}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <StatusBadge status={d.status} />
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 6,
                          color: sc.color,
                          background: sc.bg,
                        }}
                      >
                        {d.safetyScore}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Navigation */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "View All Drivers",  href: "/safety/drivers",    desc: "Manage driver roster, statuses, safety scores", color: "#3B82F6" },
            { label: "Compliance Report", href: "/safety/compliance", desc: "View license expiry and compliance dashboard",   color: "#06B6D4" },
          ].map((action, i) => (
            <a
              key={action.label}
              href={action.href}
              className="card hover-action-card"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "16px 18px",
                textDecoration: "none",
                ["--hover-border" as any]: `${action.color}30`,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `${action.color}10`,
                  border: `1px solid ${action.color}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {i === 0 ? "👥" : "📋"}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#18181B" }}>{action.label}</p>
                <p style={{ fontSize: 12, marginTop: 2, color: "#A1A1AA" }}>{action.desc}</p>
              </div>
              <span style={{ color: "#D4D4D8", fontSize: 14, flexShrink: 0 }}>→</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
