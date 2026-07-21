"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, AlertTriangle, Clock, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/AppHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate, formatCurrency } from "@/lib/utils";

interface DriverDetail {
  id: string; name: string; licenseNumber: string; licenseCategory: string;
  licenseExpiryDate: string; contactNumber: string; safetyScore: number;
  status: string; licenseState: string;
  trips: Array<{
    id: string; tripCode: string; source: string; destination: string;
    status: string; revenue: number; dispatchedAt: string | null; completedAt: string | null;
    vehicle: { name: string; registrationNumber: string };
  }>;
}

function LicenseBadge({ state }: { state: string }) {
  if (state === "VALID") {
    return (
      <span className="chip chip-green" style={{ fontWeight: 600 }}>
        <CheckCircle className="w-3.5 h-3.5" /> License Valid
      </span>
    );
  }
  if (state === "EXPIRING_SOON") {
    return (
      <span className="chip chip-amber" style={{ fontWeight: 600 }}>
        <Clock className="w-3.5 h-3.5" /> Expiring Soon
      </span>
    );
  }
  return (
    <span className="chip chip-red" style={{ fontWeight: 600 }}>
      <AlertTriangle className="w-3.5 h-3.5" /> License Expired
    </span>
  );
}

export default function DriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/drivers/${id}`)
      .then(r => r.json())
      .then(d => { setDriver(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: "36px 44px" }}>
        <div className="skeleton" style={{ height: 120, width: "100%", marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 300, width: "100%" }} />
      </div>
    );
  }

  if (!driver) {
    return (
      <div style={{ padding: "36px 44px" }}>
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#DC2626" }}>Driver Record Not Found</p>
          <button onClick={() => router.push("/safety/drivers")} className="btn btn-ghost" style={{ marginTop: 16 }}>
            Back to Drivers List
          </button>
        </div>
      </div>
    );
  }

  const completedTrips = driver.trips.filter(t => t.status === "COMPLETED");
  const totalRevenue = completedTrips.reduce((s, t) => s + t.revenue, 0);

  const scoreColor = driver.safetyScore >= 90 ? "#10B981" : driver.safetyScore >= 75 ? "#D97706" : "#DC2626";

  return (
    <div style={{ padding: "36px 44px", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Back button & PageHeader */}
      <div>
        <button
          onClick={() => router.back()}
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 16, display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Driver Roster
        </button>

        <PageHeader
          title={driver.name}
          description={`License: ${driver.licenseNumber} · Category: ${driver.licenseCategory} · Contact: ${driver.contactNumber}`}
          breadcrumb="Safety Officer / Drivers / Details"
          actions={
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <StatusBadge status={driver.status} />
              <LicenseBadge state={driver.licenseState} />
            </div>
          }
        />
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <div className="card" style={{ padding: "18px 20px", borderLeft: `3px solid ${scoreColor}` }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Safety Score
          </p>
          <p style={{ fontSize: 28, fontWeight: 700, color: scoreColor, letterSpacing: "-0.04em", lineHeight: 1 }}>
            {driver.safetyScore}<span style={{ fontSize: 14, color: "#A1A1AA", fontWeight: 400 }}>/100</span>
          </p>
          <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>
            {driver.safetyScore >= 90 ? "Excellent safety record" : driver.safetyScore >= 75 ? "Good record" : "Needs safety review"}
          </p>
        </div>

        <div className="card" style={{ padding: "18px 20px", borderLeft: "3px solid #3B82F6" }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            License Category
          </p>
          <p style={{ fontSize: 24, fontWeight: 700, color: "#18181B", letterSpacing: "-0.03em", lineHeight: 1 }}>
            {driver.licenseCategory}
          </p>
          <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>Commercial Transport</p>
        </div>

        <div className="card" style={{ padding: "18px 20px", borderLeft: `3px solid ${driver.licenseState === "EXPIRED" ? "#DC2626" : driver.licenseState === "EXPIRING_SOON" ? "#D97706" : "#10B981"}` }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            License Expiry
          </p>
          <p style={{ fontSize: 20, fontWeight: 700, color: "#18181B", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            {formatDate(driver.licenseExpiryDate)}
          </p>
          <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>
            Status: {driver.licenseState.replace("_", " ")}
          </p>
        </div>

        <div className="card" style={{ padding: "18px 20px", borderLeft: "3px solid #10B981" }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Total Revenue Generated
          </p>
          <p style={{ fontSize: 24, fontWeight: 700, color: "#10B981", letterSpacing: "-0.03em", lineHeight: 1 }}>
            {formatCurrency(totalRevenue)}
          </p>
          <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>{completedTrips.length} completed trips</p>
        </div>
      </div>

      {/* Compliance Alert Banners */}
      {driver.licenseState === "EXPIRED" && (
        <div className="card" style={{ padding: "16px 20px", background: "#FEF2F2", borderColor: "#FEE2E2", display: "flex", alignItems: "center", gap: 12 }}>
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#DC2626" }}>License Expired — Immediate Action Required</p>
            <p style={{ fontSize: 12, color: "#991B1B", marginTop: 2 }}>This driver is automatically blocked from trip dispatch until valid license renewal is confirmed.</p>
          </div>
        </div>
      )}
      {driver.licenseState === "EXPIRING_SOON" && (
        <div className="card" style={{ padding: "16px 20px", background: "#FFFBEB", borderColor: "#FDE68A", display: "flex", alignItems: "center", gap: 12 }}>
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#D97706" }}>License Expiring Soon</p>
            <p style={{ fontSize: 12, color: "#92400E", marginTop: 2 }}>License expires on {formatDate(driver.licenseExpiryDate)}. Schedule renewal before next dispatch assignment.</p>
          </div>
        </div>
      )}

      {/* Driver Trip History Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="card-header">
          <div>
            <p className="card-header-title">Assigned Trip History</p>
            <p className="card-header-sub">Lifetime dispatch records & performance</p>
          </div>
          <span className="chip chip-slate">{driver.trips.length} trips</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                {["Trip Code", "Route", "Vehicle", "Revenue", "Status", "Date"].map(h => (
                  <th key={h} className="th-cell">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {driver.trips.map(t => (
                <tr key={t.id} className="table-row-hover">
                  <td className="td-cell" style={{ fontFamily: "monospace", color: "#3B82F6", fontWeight: 600 }}>{t.tripCode}</td>
                  <td className="td-cell" style={{ fontWeight: 500, color: "#09090B" }}>{t.source} → {t.destination}</td>
                  <td className="td-cell">
                    <p style={{ fontWeight: 500, color: "#09090B" }}>{t.vehicle.name}</p>
                    <p style={{ fontSize: 11, color: "#A1A1AA", fontFamily: "monospace" }}>{t.vehicle.registrationNumber}</p>
                  </td>
                  <td className="td-cell" style={{ fontWeight: 600, color: "#10B981" }}>{formatCurrency(t.revenue)}</td>
                  <td className="td-cell"><StatusBadge status={t.status} /></td>
                  <td className="td-cell" style={{ color: "#71717A" }}>{formatDate(t.completedAt || t.dispatchedAt || "")}</td>
                </tr>
              ))}
              {driver.trips.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "48px 16px", textAlign: "center", color: "#A1A1AA" }}>
                    No trips assigned to this driver yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
