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
    if (score >= 90) return { color: "#16a34a", bg: "#f0fdf4" };
    if (score >= 80) return { color: "#2563eb", bg: "#eff6ff" };
    if (score >= 70) return { color: "#d97706", bg: "#fffbeb" };
    return { color: "#dc2626", bg: "#fef2f2" };
  };

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      {/* Hero Header */}
      <div
        className="relative overflow-hidden px-6 pt-8 pb-10"
        style={{ background: "linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a0f3a 100%)" }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle, #f59e0b, transparent)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full opacity-8 pointer-events-none" style={{ background: "radial-gradient(circle, #8b5cf6, transparent)", transform: "translateY(50%)" }} />

        <div className="relative">
          <span className="text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full mb-3 inline-block" style={{ background: "rgba(245,158,11,0.2)", color: "#fcd34d" }}>Safety Officer</span>
          <h1 className="text-3xl font-bold text-white mb-1">Safety Command</h1>
          <p className="text-sm" style={{ color: "#94a3b8" }}>Driver compliance, licensing and safety score monitoring</p>
        </div>

        {/* KPI Hero Bar */}
        <div className="relative mt-8 grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Total Drivers", value: totalDrivers, color: "#a78bfa", emoji: "👥" },
            { label: "Valid Licenses", value: validLicenses, color: "#22c55e", emoji: "✅" },
            { label: "Avg Safety Score", value: `${avgSafetyScore}/100`, color: "#60a5fa", emoji: "⭐" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>{kpi.label}</span>
                <span className="text-lg">{kpi.emoji}</span>
              </div>
              <p className="text-3xl font-extrabold text-white">{kpi.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-6 space-y-5">
        {/* Compliance Alert Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Expiring (30d)", value: expiringDrivers, accent: "#f59e0b", bg: "#fffbeb", desc: "Renewal required soon", icon: "⚠️" },
            { label: "Expired Licenses", value: expiredLicenses, accent: "#ef4444", bg: "#fef2f2", desc: "Immediate action needed", icon: "🚫" },
            { label: "Suspended", value: suspendedDrivers, accent: "#dc2626", bg: "#fef2f2", desc: "Currently suspended", icon: "⛔" },
            { label: "Compliance Rate", value: `${complianceRate}%`, accent: complianceRate >= 80 ? "#16a34a" : "#dc2626", bg: complianceRate >= 80 ? "#f0fdf4" : "#fef2f2", desc: "Active driver rate", icon: "📊" },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-2xl p-5" style={{ border: "1px solid #e2e8f0", borderLeft: `4px solid ${card.accent}` }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                <span className="text-xl">{card.icon}</span>
              </div>
              <p className="text-3xl font-extrabold" style={{ color: card.accent }}>{card.value}</p>
              <p className="text-xs text-slate-400 mt-1">{card.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Low Safety Score Drivers */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #fecaca" }}>
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid #fef2f2", background: "linear-gradient(to right, #fff5f5, #fff)" }}>
              <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center">
                <span className="text-base">⚠️</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-800">Low Safety Score Drivers</h3>
                <p className="text-xs text-red-400">Scoring below 80/100</p>
              </div>
              {lowScoreDrivers.length > 0 && (
                <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600">{lowScoreDrivers.length} drivers</span>
              )}
            </div>
            <div className="divide-y divide-slate-50">
              {lowScoreDrivers.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <div className="text-3xl mb-3">🏆</div>
                  <p className="text-sm font-semibold text-green-600">Excellent Fleet Performance</p>
                  <p className="text-xs text-slate-400 mt-1">All drivers scoring 80+</p>
                </div>
              ) : (
                lowScoreDrivers.map((d) => {
                  const sc = getScoreColor(d.safetyScore);
                  return (
                    <div key={d.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: sc.color }}>
                          {d.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{d.name}</p>
                          <p className="text-xs text-slate-500">{d.licenseNumber} · {d.licenseCategory}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={d.status} />
                        <div className="text-right">
                          <span className="text-lg font-extrabold" style={{ color: sc.color }}>{d.safetyScore}</span>
                          <span className="text-xs text-slate-400">/100</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Driver Overview */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Driver Status Overview</h3>
                <p className="text-xs text-slate-400 mt-0.5">License & compliance status</p>
              </div>
              <a href="/safety/drivers" className="text-xs font-semibold text-blue-600 hover:text-blue-700">View all →</a>
            </div>
            <div className="divide-y divide-slate-50">
              {allDrivers.map((d) => {
                const isExpired = new Date(d.licenseExpiryDate) < today;
                const isExpiring = !isExpired && new Date(d.licenseExpiryDate) <= in30Days;
                const sc = getScoreColor(d.safetyScore);
                return (
                  <div key={d.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: sc.color }}>
                      {d.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{d.name}</p>
                      <p className="text-xs text-slate-400">
                        Expires: {formatDate(d.licenseExpiryDate)}
                        {isExpired && <span className="ml-1 text-red-500 font-semibold">(EXPIRED)</span>}
                        {isExpiring && <span className="ml-1 text-amber-500 font-semibold">(EXPIRING)</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={d.status} />
                      <span className="text-sm font-bold" style={{ color: sc.color }}>{d.safetyScore}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { label: "View All Drivers", href: "/safety/drivers", desc: "Manage driver roster, statuses, safety scores", icon: "👥", color: "#7c3aed", bg: "#faf5ff" },
            { label: "Compliance Report", href: "/safety/compliance", desc: "View license expiry and compliance dashboard", icon: "📋", color: "#0891b2", bg: "#ecfeff" },
          ].map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="flex items-center gap-4 bg-white rounded-2xl px-6 py-5 hover:-translate-y-0.5 hover:shadow-md transition-all"
              style={{ border: "1px solid #e2e8f0" }}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: action.bg }}>
                {action.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{action.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{action.desc}</p>
              </div>
              <span className="ml-auto text-slate-400">→</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
