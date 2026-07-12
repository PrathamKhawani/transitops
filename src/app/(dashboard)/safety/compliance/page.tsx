import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/AppHeader";
import { AlertTriangle, Clock, CheckCircle, ShieldCheck, TrendingUp } from "lucide-react";
import { formatDate } from "@/lib/utils";

const BAND_COLOR = (score: number) =>
  score >= 90 ? "#16a34a" : score >= 75 ? "#2563eb" : score >= 60 ? "#d97706" : "#dc2626";
const BAND_LABEL = (score: number) =>
  score >= 90 ? "Excellent" : score >= 75 ? "Good" : score >= 60 ? "Moderate" : "Poor";

export default async function CompliancePage() {
  const session = await requireAuth();
  if (!session || session.role !== "SAFETY_OFFICER") redirect("/login");

  const today = new Date();
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Fetch drivers with their assigned trips (non-draft only)
  const drivers = await prisma.driver.findMany({
    include: {
      trips: {
        where: { status: { not: "DRAFT" } },
        select: { status: true },
      },
    },
  });

  // Classify
  const getLicenseState = (d: Date) => {
    if (d < today) return "EXPIRED";
    if (d <= in30Days) return "EXPIRING_SOON";
    return "VALID";
  };

  const daysUntilExpiry = (d: Date) =>
    Math.max(0, Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  // Enrich driver data
  const enriched = drivers.map(d => {
    const total = d.trips.length;
    const completed = d.trips.filter(t => t.status === "COMPLETED").length;
    const tripCompletionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const licenseState = getLicenseState(d.licenseExpiryDate);
    const daysLeft = daysUntilExpiry(d.licenseExpiryDate);
    return { ...d, total, completed, tripCompletionPct, licenseState, daysLeft };
  });

  // Sort: EXPIRED first → EXPIRING_SOON → VALID, within groups by daysLeft asc
  const ORDER = { EXPIRED: 0, EXPIRING_SOON: 1, VALID: 2 } as const;
  const sorted = [...enriched].sort((a, b) =>
    ORDER[a.licenseState as keyof typeof ORDER] - ORDER[b.licenseState as keyof typeof ORDER] ||
    a.daysLeft - b.daysLeft
  );

  const expired = enriched.filter(d => d.licenseState === "EXPIRED");
  const expiring = enriched.filter(d => d.licenseState === "EXPIRING_SOON");
  const valid = enriched.filter(d => d.licenseState === "VALID");

  // Fleet avg safety score
  const avgSafety = drivers.length > 0 ? Math.round(drivers.reduce((s, d) => s + d.safetyScore, 0) / drivers.length) : 0;
  const avgCompletion = drivers.length > 0 ? Math.round(enriched.reduce((s, d) => s + d.tripCompletionPct, 0) / drivers.length) : 0;

  return (
    <div className="p-6">
      <PageHeader title="License Compliance" description="Driver license validity, trip completion rates, and safety scoring" breadcrumb="Safety Officer" />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4" style={{ border: "1px solid #fecaca" }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#dc2626" }}>Expired</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "#0f172a" }}>{expired.length}</p>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>Immediate renewal required</p>
        </div>
        <div className="bg-white rounded-xl p-4" style={{ border: "1px solid #fde68a" }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#d97706" }}>Expiring ≤ 30d</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "#0f172a" }}>{expiring.length}</p>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>Schedule renewal now</p>
        </div>
        <div className="bg-white rounded-xl p-4" style={{ border: "1px solid #bbf7d0" }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#16a34a" }}>Valid</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "#0f172a" }}>{valid.length}</p>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>Valid for 30+ days</p>
        </div>
        <div className="bg-white rounded-xl p-4" style={{ border: "1px solid #e2e8f0" }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>Avg Safety Score</p>
          <p className="text-2xl font-bold mt-1" style={{ color: BAND_COLOR(avgSafety) }}>{avgSafety}</p>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>{BAND_LABEL(avgSafety)}</p>
        </div>
        <div className="bg-white rounded-xl p-4" style={{ border: "1px solid #e2e8f0" }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>Avg Trip Completion</p>
          <p className="text-2xl font-bold mt-1" style={{ color: BAND_COLOR(avgCompletion) }}>{avgCompletion}%</p>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>Fleet average</p>
        </div>
      </div>

      {/* Compliance Table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid #f1f5f9" }}>
          <ShieldCheck className="w-4 h-4" style={{ color: "#7c3aed" }} />
          <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Driver Compliance</p>
          <span className="ml-auto text-xs" style={{ color: "#94a3b8" }}>Sorted: Expired → Expiring → Valid</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                {["Driver", "License No.", "Category", "Expiry Date", "Days Left", "Compliance", "Safety Score", "Trips", "Completion %", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((d, i) => (
                <tr key={d.id} style={{ borderBottom: i < sorted.length - 1 ? "1px solid #f8fafc" : "none" }}>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold" style={{ color: "#0f172a" }}>{d.name}</p>
                  </td>
                  <td className="px-4 py-3.5 font-mono" style={{ color: "#64748b" }}>{d.licenseNumber}</td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: "#eff6ff", color: "#2563eb" }}>{d.licenseCategory}</span>
                  </td>
                  <td className="px-4 py-3.5 font-medium" style={{ color: d.licenseState === "EXPIRED" ? "#dc2626" : d.licenseState === "EXPIRING_SOON" ? "#d97706" : "#16a34a" }}>
                    {formatDate(d.licenseExpiryDate)}
                  </td>
                  <td className="px-4 py-3.5">
                    {d.licenseState === "EXPIRED"
                      ? <span className="text-red-600 font-bold">OVERDUE</span>
                      : <span style={{ color: d.daysLeft <= 30 ? "#d97706" : "#64748b" }}>{d.daysLeft}d</span>
                    }
                  </td>
                  <td className="px-4 py-3.5">
                    {d.licenseState === "EXPIRED" && <span className="flex items-center gap-1 font-semibold text-red-600"><AlertTriangle className="w-3.5 h-3.5" />EXPIRED</span>}
                    {d.licenseState === "EXPIRING_SOON" && <span className="flex items-center gap-1 font-semibold" style={{ color: "#d97706" }}><Clock className="w-3.5 h-3.5" />EXPIRING SOON</span>}
                    {d.licenseState === "VALID" && <span className="flex items-center gap-1 font-semibold text-green-600"><CheckCircle className="w-3.5 h-3.5" />VALID</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full" style={{ background: "#f1f5f9" }}>
                        <div className="h-1.5 rounded-full" style={{ background: BAND_COLOR(d.safetyScore), width: `${d.safetyScore}%` }} />
                      </div>
                      <span className="font-semibold" style={{ color: BAND_COLOR(d.safetyScore) }}>{d.safetyScore}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5" style={{ color: "#64748b" }}>
                    <span style={{ color: "#0f172a" }}>{d.completed}</span><span style={{ color: "#94a3b8" }}>/{d.total}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full" style={{ background: "#f1f5f9" }}>
                        <div className="h-1.5 rounded-full" style={{ background: BAND_COLOR(d.tripCompletionPct), width: `${d.tripCompletionPct}%` }} />
                      </div>
                      <span className="font-semibold" style={{ color: BAND_COLOR(d.tripCompletionPct) }}>
                        {d.total === 0 ? "—" : `${d.tripCompletionPct}%`}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{
                      background: d.status === "AVAILABLE" ? "#f0fdf4" : d.status === "ON_TRIP" ? "#eff6ff" : d.status === "SUSPENDED" ? "#fef2f2" : "#f8fafc",
                      color: d.status === "AVAILABLE" ? "#16a34a" : d.status === "ON_TRIP" ? "#2563eb" : d.status === "SUSPENDED" ? "#dc2626" : "#64748b"
                    }}>
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center" style={{ color: "#94a3b8" }}>No drivers found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Safety Band Legend */}
        <div className="px-5 py-3 flex items-center gap-5" style={{ borderTop: "1px solid #f1f5f9", background: "#fafafa" }}>
          <span className="text-xs font-medium" style={{ color: "#64748b" }}>Safety Bands:</span>
          {[{ label: "Excellent (90–100)", color: "#16a34a" }, { label: "Good (75–89)", color: "#2563eb" }, { label: "Moderate (60–74)", color: "#d97706" }, { label: "Poor (<60)", color: "#dc2626" }].map(b => (
            <div key={b.label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: b.color }} />
              <span className="text-xs" style={{ color: "#374151" }}>{b.label}</span>
            </div>
          ))}
          <span className="ml-auto text-xs" style={{ color: "#94a3b8" }}>Completion% = completed / total assigned (non-draft) × 100</span>
        </div>
      </div>
    </div>
  );
}
