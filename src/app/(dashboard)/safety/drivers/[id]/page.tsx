"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, AlertTriangle, Clock } from "lucide-react";
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
  const cfg = state === "VALID"
    ? { bg: "#f0fdf4", color: "#16a34a", icon: <CheckCircle className="w-3.5 h-3.5" />, label: "Valid" }
    : state === "EXPIRING_SOON"
    ? { bg: "#fffbeb", color: "#d97706", icon: <Clock className="w-3.5 h-3.5" />, label: "Expiring Soon" }
    : { bg: "#fef2f2", color: "#dc2626", icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Expired" };
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.icon} {cfg.label}
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

  if (loading) return <div className="p-8 text-sm" style={{ color: "#64748b" }}>Loading driver...</div>;
  if (!driver) return <div className="p-8 text-sm text-red-500">Driver not found</div>;

  const completedTrips = driver.trips.filter(t => t.status === "COMPLETED");
  const totalRevenue = completedTrips.reduce((s, t) => s + t.revenue, 0);

  // Score gauge color
  const scoreColor = driver.safetyScore >= 90 ? "#16a34a" : driver.safetyScore >= 75 ? "#d97706" : "#dc2626";
  const scoreArc = (driver.safetyScore / 100) * 180;

  return (
    <div className="p-6 max-w-4xl">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs mb-5" style={{ color: "#64748b" }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Drivers
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold" style={{ color: "#0f172a" }}>{driver.name}</h1>
            <StatusBadge status={driver.status} />
            <LicenseBadge state={driver.licenseState} />
          </div>
          <p className="text-sm font-mono" style={{ color: "#64748b" }}>{driver.licenseNumber}</p>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>{driver.licenseCategory} · {driver.contactNumber}</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Safety Score", value: `${driver.safetyScore}/100`, color: scoreColor },
          { label: "License Category", value: driver.licenseCategory },
          { label: "License Expiry", value: formatDate(driver.licenseExpiryDate) },
          { label: "Completed Trips", value: `${completedTrips.length} trips` },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <p className="text-xs" style={{ color: "#94a3b8" }}>{label}</p>
            <p className="text-lg font-bold mt-0.5" style={{ color: color || "#0f172a" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* License compliance alert */}
      {driver.licenseState === "EXPIRED" && (
        <div className="flex items-center gap-3 p-4 rounded-xl mb-5" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#dc2626" }}>License Expired</p>
            <p className="text-xs mt-0.5" style={{ color: "#b91c1c" }}>This driver cannot be assigned to any trips until license is renewed.</p>
          </div>
        </div>
      )}
      {driver.licenseState === "EXPIRING_SOON" && (
        <div className="flex items-center gap-3 p-4 rounded-xl mb-5" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
          <Clock className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#d97706" }}>License Expiring Soon</p>
            <p className="text-xs mt-0.5" style={{ color: "#b45309" }}>License expires {formatDate(driver.licenseExpiryDate)}. Renewal recommended before dispatch.</p>
          </div>
        </div>
      )}

      {/* Trip History */}
      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: "#0f172a" }}>Trip History ({driver.trips.length})</p>
        {driver.trips.length === 0 ? (
          <div className="rounded-xl p-8 text-center text-sm" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#94a3b8" }}>No trips assigned</div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
            <table className="w-full text-sm">
              <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <tr>{["Trip Code", "Route", "Vehicle", "Revenue", "Status", "Date"].map(h => <th key={h} className="px-4 py-3 text-xs font-medium text-left" style={{ color: "#64748b" }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {driver.trips.map((t, i) => (
                  <tr key={t.id} style={{ borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "#475569" }}>{t.tripCode}</td>
                    <td className="px-4 py-3 text-xs">{t.source} → {t.destination}</td>
                    <td className="px-4 py-3 text-xs">{t.vehicle.name}<br /><span style={{ color: "#94a3b8" }}>{t.vehicle.registrationNumber}</span></td>
                    <td className="px-4 py-3 text-xs">{formatCurrency(t.revenue)}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#94a3b8" }}>{formatDate(t.completedAt || t.dispatchedAt || "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
