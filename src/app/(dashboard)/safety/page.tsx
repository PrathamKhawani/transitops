import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/AppHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Users, ShieldCheck, AlertTriangle, XCircle, TrendingUp } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function SafetyDashboard() {
  const session = await requireAuth();
  if (!session || session.role !== "SAFETY_OFFICER") redirect("/login");

  const today = new Date();
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [totalDrivers, validLicenses, expiringDrivers, expiredLicenses, suspendedDrivers, avgScore, lowScoreDrivers] = await Promise.all([
    prisma.driver.count(),
    prisma.driver.count({ where: { licenseExpiryDate: { gt: in30Days } } }),
    prisma.driver.count({ where: { licenseExpiryDate: { gt: today, lte: in30Days } } }),
    prisma.driver.count({ where: { licenseExpiryDate: { lte: today } } }),
    prisma.driver.count({ where: { status: "SUSPENDED" } }),
    prisma.driver.aggregate({ _avg: { safetyScore: true } }),
    prisma.driver.findMany({ where: { safetyScore: { lt: 80 } }, orderBy: { safetyScore: "asc" }, take: 5 }),
  ]);

  const avgSafetyScore = Math.round(avgScore._avg.safetyScore || 0);

  return (
    <div className="p-6">
      <PageHeader title="Safety Dashboard" description="Monitor driver compliance, licenses and safety scores" breadcrumb="Safety Officer" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KpiCard title="Total Drivers" value={totalDrivers} icon={Users} iconColor="#2563eb" iconBg="#eff6ff" accent="#2563eb" />
        <KpiCard title="Valid Licenses" value={validLicenses} subtitle="Valid for 30+ days" icon={ShieldCheck} iconColor="#16a34a" iconBg="#f0fdf4" accent="#22c55e" />
        <KpiCard title="Avg Safety Score" value={`${avgSafetyScore}/100`} subtitle="Fleet average" icon={TrendingUp} iconColor="#7c3aed" iconBg="#faf5ff" accent="#8b5cf6" />
        <KpiCard title="Expiring (30d)" value={expiringDrivers} subtitle="Renewal required soon" icon={AlertTriangle} iconColor="#d97706" iconBg="#fffbeb" accent="#f59e0b" />
        <KpiCard title="Expired Licenses" value={expiredLicenses} subtitle="Immediate action needed" icon={XCircle} iconColor="#dc2626" iconBg="#fef2f2" accent="#ef4444" />
        <KpiCard title="Suspended Drivers" value={suspendedDrivers} subtitle="Currently suspended" icon={XCircle} iconColor="#dc2626" iconBg="#fef2f2" accent="#ef4444" />
      </div>

      {/* Low Safety Score Alert */}
      {lowScoreDrivers.length > 0 && (
        <div className="bg-white rounded-xl mb-6" style={{ border: "1px solid #fecaca" }}>
          <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid #fef2f2", background: "#fff5f5", borderRadius: "12px 12px 0 0" }}>
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-red-700">Drivers with Low Safety Scores</h3>
          </div>
          <div className="divide-y" style={{ borderColor: "#fef2f2" }}>
            {lowScoreDrivers.map((d) => (
              <div key={d.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{d.name}</p>
                  <p className="text-xs" style={{ color: "#94a3b8" }}>{d.licenseNumber} · {d.licenseCategory}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={d.status} />
                  <span className="text-sm font-bold" style={{ color: d.safetyScore < 70 ? "#dc2626" : "#d97706" }}>
                    {d.safetyScore}/100
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
