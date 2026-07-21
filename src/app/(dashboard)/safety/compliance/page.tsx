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
  if (!session) redirect("/login");

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
    <div style={{ padding: "36px 44px" }}>
      <PageHeader
        title="License Compliance"
        description="Driver license validity, trip completion rates, and safety scoring overview"
        breadcrumb="Safety Officer"
      />

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 28 }}>
        <div className="card" style={{ padding: "18px 20px", borderLeft: "3px solid #DC2626" }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Expired</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: "#18181B", letterSpacing: "-0.03em", lineHeight: 1 }}>{expired.length}</p>
          <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>Immediate renewal required</p>
        </div>
        <div className="card" style={{ padding: "18px 20px", borderLeft: "3px solid #F59E0B" }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Expiring ≤ 30d</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: "#18181B", letterSpacing: "-0.03em", lineHeight: 1 }}>{expiring.length}</p>
          <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>Schedule renewal now</p>
        </div>
        <div className="card" style={{ padding: "18px 20px", borderLeft: "3px solid #10B981" }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Valid</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: "#18181B", letterSpacing: "-0.03em", lineHeight: 1 }}>{valid.length}</p>
          <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>Valid for 30+ days</p>
        </div>
        <div className="card" style={{ padding: "18px 20px", borderLeft: `3px solid ${BAND_COLOR(avgSafety)}` }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Avg Safety Score</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: BAND_COLOR(avgSafety), letterSpacing: "-0.03em", lineHeight: 1 }}>{avgSafety}</p>
          <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>{BAND_LABEL(avgSafety)}</p>
        </div>
        <div className="card" style={{ padding: "18px 20px", borderLeft: `3px solid ${BAND_COLOR(avgCompletion)}` }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Avg Trip Completion</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: BAND_COLOR(avgCompletion), letterSpacing: "-0.03em", lineHeight: 1 }}>{avgCompletion}%</p>
          <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>Fleet average</p>
        </div>
      </div>

      {/* Compliance Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck style={{ width: 15, height: 15, color: "#7C3AED" }} />
            </div>
            <div>
              <p className="card-header-title">Driver Compliance Matrix</p>
              <p className="card-header-sub">Sorted: Expired → Expiring → Valid</p>
            </div>
          </div>
          <span className="chip chip-slate">{sorted.length} drivers</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                {["Driver", "License No.", "Category", "Expiry Date", "Days Left", "Compliance", "Safety Score", "Trips", "Completion %", "Status"].map(h => (
                  <th key={h} className="th-cell">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((d) => (
                <tr key={d.id} className="table-row-hover">
                  <td className="td-cell">
                    <p style={{ fontWeight: 600, color: "#09090B" }}>{d.name}</p>
                  </td>
                  <td className="td-cell" style={{ fontFamily: "monospace", color: "#71717A" }}>{d.licenseNumber}</td>
                  <td className="td-cell">
                    <span className="chip chip-blue">{d.licenseCategory}</span>
                  </td>
                  <td className="td-cell" style={{ fontWeight: 500, color: d.licenseState === "EXPIRED" ? "#DC2626" : d.licenseState === "EXPIRING_SOON" ? "#D97706" : "#16A34A" }}>
                    {formatDate(d.licenseExpiryDate)}
                  </td>
                  <td className="td-cell">
                    {d.licenseState === "EXPIRED"
                      ? <span style={{ color: "#DC2626", fontWeight: 700 }}>OVERDUE</span>
                      : <span style={{ color: d.daysLeft <= 30 ? "#D97706" : "#71717A", fontWeight: 500 }}>{d.daysLeft}d</span>
                    }
                  </td>
                  <td className="td-cell">
                    {d.licenseState === "EXPIRED" && (
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 600, color: "#DC2626" }}>
                        <AlertTriangle style={{ width: 13, height: 13 }} />EXPIRED
                      </span>
                    )}
                    {d.licenseState === "EXPIRING_SOON" && (
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 600, color: "#D97706" }}>
                        <Clock style={{ width: 13, height: 13 }} />EXPIRING SOON
                      </span>
                    )}
                    {d.licenseState === "VALID" && (
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 600, color: "#059669" }}>
                        <CheckCircle style={{ width: 13, height: 13 }} />VALID
                      </span>
                    )}
                  </td>
                  <td className="td-cell">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="progress-track" style={{ width: 60 }}>
                        <div className="progress-fill" style={{ background: BAND_COLOR(d.safetyScore), width: `${d.safetyScore}%` }} />
                      </div>
                      <span style={{ fontWeight: 600, color: BAND_COLOR(d.safetyScore) }}>{d.safetyScore}</span>
                    </div>
                  </td>
                  <td className="td-cell">
                    <span style={{ color: "#09090B", fontWeight: 600 }}>{d.completed}</span>
                    <span style={{ color: "#A1A1AA" }}>/{d.total}</span>
                  </td>
                  <td className="td-cell">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="progress-track" style={{ width: 60 }}>
                        <div className="progress-fill" style={{ background: BAND_COLOR(d.tripCompletionPct), width: `${d.tripCompletionPct}%` }} />
                      </div>
                      <span style={{ fontWeight: 600, color: BAND_COLOR(d.tripCompletionPct) }}>
                        {d.total === 0 ? "—" : `${d.tripCompletionPct}%`}
                      </span>
                    </div>
                  </td>
                  <td className="td-cell">
                    <span className={
                      d.status === "AVAILABLE" ? "chip chip-green"
                      : d.status === "ON_TRIP" ? "chip chip-blue"
                      : d.status === "SUSPENDED" ? "chip chip-red"
                      : "chip chip-slate"
                    }>
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: "48px 16px", textAlign: "center", color: "#A1A1AA" }}>No drivers found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Safety Band Legend */}
        <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", gap: 20, borderTop: "1px solid #E4E4E7", background: "#FAFAFA" }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: "#71717A" }}>Safety Bands:</span>
          {[
            { label: "Excellent (90–100)", color: "#16A34A" },
            { label: "Good (75–89)", color: "#2563EB" },
            { label: "Moderate (60–74)", color: "#D97706" },
            { label: "Poor (<60)", color: "#DC2626" },
          ].map(b => (
            <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: b.color }} />
              <span style={{ fontSize: 12, color: "#3F3F46" }}>{b.label}</span>
            </div>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#A1A1AA" }}>
            Completion% = completed / total assigned (non-draft) × 100
          </span>
        </div>
      </div>
    </div>
  );
}
