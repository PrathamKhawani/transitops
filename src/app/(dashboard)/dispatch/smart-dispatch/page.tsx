"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Zap, TrendingUp, Fuel, Wrench, CheckCircle2, AlertTriangle, XCircle, ChevronRight, ArrowRight, Users, Car } from "lucide-react";
import { PageHeader } from "@/components/layout/AppHeader";

interface ScoredVehicle {
  id: string; name: string; registrationNumber: string; type: string; region: string;
  maximumLoadCapacity: number; odometer: number;
  capacityUtilization: number; capacityFit: number;
  fuelEfficiency: number | null; fuelScore: number;
  maintenanceScore: number; availabilityScore: number; vehicleScore: number;
}
interface ScoredDriver {
  id: string; name: string; licenseNumber: string; licenseCategory: string;
  safetyScore: number; licenseState: string; daysUntilExpiry: number;
  licenseScore: number; driverScore: number;
}
interface RejectedVehicle { name: string; registrationNumber: string; type: string; maximumLoadCapacity: number; reason: string; }
interface RejectedDriver { name: string; licenseNumber: string; reason: string; }

interface RecommendResult {
  vehicles: ScoredVehicle[];
  drivers: ScoredDriver[];
  rejectedVehicles: RejectedVehicle[];
  rejectedDrivers: RejectedDriver[];
  recommended: { vehicle: ScoredVehicle | null; driver: ScoredDriver | null; confidence: number };
  inputs: { cargoWeight: number; plannedDistance: number };
  fleetAvgEfficiency: number;
}

function ScoreBar({ label, score, color, icon: Icon }: { label: string; score: number; color: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
      <span className="text-xs w-28 flex-shrink-0" style={{ color: "#64748b" }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "#f1f5f9" }}>
        <div className="h-1.5 rounded-full transition-all" style={{ background: color, width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold w-8 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

const CONFIDENCE_COLOR = (c: number) => c >= 80 ? "#16a34a" : c >= 60 ? "#d97706" : "#dc2626";
const CONFIDENCE_LABEL = (c: number) => c >= 80 ? "High Confidence" : c >= 60 ? "Moderate" : "Low Confidence";

const LICENSE_COLOR: Record<string, string> = { VALID: "#16a34a", EXPIRING_SOON: "#d97706", EXPIRED: "#dc2626" };

export default function SmartDispatchPage() {
  const router = useRouter();
  const [form, setForm] = useState({ source: "", destination: "", cargoWeight: "", plannedDistance: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<ScoredVehicle | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<ScoredDriver | null>(null);

  const runRecommendation = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cargoWeight || !form.plannedDistance) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/trips/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cargoWeight: Number(form.cargoWeight), plannedDistance: Number(form.plannedDistance) }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setResult(data);
      setSelectedVehicle(data.recommended.vehicle);
      setSelectedDriver(data.recommended.driver);
    } catch { toast.error("Request failed"); }
    finally { setLoading(false); }
  }, [form]);

  function useRecommendation() {
    if (!selectedVehicle || !selectedDriver) { toast.error("Select a vehicle and driver first"); return; }
    const params = new URLSearchParams({
      rec: "1",
      vehicleId: selectedVehicle.id,
      driverId: selectedDriver.id,
      source: form.source,
      destination: form.destination,
      cargoWeight: form.cargoWeight,
      plannedDistance: form.plannedDistance,
    });
    router.push(`/dispatch/trips?${params}`);
  }

  const vehicle = selectedVehicle ?? result?.recommended.vehicle ?? null;
  const driver = selectedDriver ?? result?.recommended.driver ?? null;

  return (
    <div className="p-6">
      <PageHeader
        title="Smart Dispatch"
        description="Deterministic recommendation engine — Capacity Fit 35% · Fuel Efficiency 30% · Maintenance Reliability 20% · Availability 15%"
        breadcrumb="Dispatcher"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
        {/* ── Input Form ── */}
        <div>
          <div className="bg-white rounded-xl p-5 mb-4" style={{ border: "1px solid #e2e8f0" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#eff6ff" }}>
                <Zap className="w-4 h-4" style={{ color: "#2563eb" }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Smart Dispatch Input</p>
            </div>
            <form onSubmit={runRecommendation} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>From</label>
                  <input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="Ahmedabad" className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>To</label>
                  <input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} placeholder="Surat" className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Cargo Weight (T) *</label>
                <input required type="number" step="0.01" min="0.01" value={form.cargoWeight} onChange={e => setForm({ ...form, cargoWeight: e.target.value })} placeholder="0.45" className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
                <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>e.g. 0.45 = 450 kg · 28 = 28 tonnes</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Planned Distance (km) *</label>
                <input required type="number" min="1" value={form.plannedDistance} onChange={e => setForm({ ...form, plannedDistance: e.target.value })} placeholder="265" className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
              </div>
              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60" style={{ background: "#2563eb" }}>
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing...</> : <><Zap className="w-4 h-4" /> Run Smart Dispatch</>}
              </button>
            </form>
          </div>

          {/* Scoring legend */}
          <div className="rounded-xl p-4 text-xs" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <p className="font-semibold mb-2" style={{ color: "#64748b" }}>SCORING WEIGHTS</p>
            {[
              { label: "Capacity Fit", weight: "35%", color: "#2563eb" },
              { label: "Fuel Efficiency", weight: "30%", color: "#16a34a" },
              { label: "Maintenance Reliability", weight: "20%", color: "#f59e0b" },
              { label: "Availability", weight: "15%", color: "#8b5cf6" },
            ].map(i => (
              <div key={i.label} className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: i.color }} />
                  <span style={{ color: "#374151" }}>{i.label}</span>
                </div>
                <span className="font-semibold" style={{ color: i.color }}>{i.weight}</span>
              </div>
            ))}
            <div className="border-t mt-2 pt-2" style={{ borderColor: "#e2e8f0" }}>
              <p style={{ color: "#64748b" }}>Driver: Safety 50% · License 30% · Availability 20%</p>
            </div>
          </div>
        </div>

        {/* ── Results ── */}
        <div>
          {!result && !loading && (
            <div className="bg-white rounded-xl flex flex-col items-center justify-center py-20" style={{ border: "1px solid #e2e8f0" }}>
              <Zap className="w-10 h-10 mb-3" style={{ color: "#e2e8f0" }} />
              <p className="text-sm font-medium" style={{ color: "#94a3b8" }}>Enter cargo weight and distance to get recommendation</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Confidence + Use button */}
              <div className="bg-white rounded-xl p-5 flex items-center justify-between" style={{ border: `1px solid ${CONFIDENCE_COLOR(result.recommended.confidence)}33` }}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: CONFIDENCE_COLOR(result.recommended.confidence) }} />
                    <p className="text-sm font-semibold" style={{ color: CONFIDENCE_COLOR(result.recommended.confidence) }}>
                      {CONFIDENCE_LABEL(result.recommended.confidence)} — {result.recommended.confidence}%
                    </p>
                  </div>
                  <p className="text-xs" style={{ color: "#64748b" }}>
                    Cargo: <strong>{result.inputs.cargoWeight}T</strong> · Distance: <strong>{result.inputs.plannedDistance} km</strong> · Fleet avg efficiency: <strong>{result.fleetAvgEfficiency} km/L</strong>
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
                    {result.vehicles.length} eligible vehicle(s) · {result.drivers.length} eligible driver(s)
                  </p>
                </div>
                {result.recommended.vehicle && result.recommended.driver && (
                  <button onClick={useRecommendation} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#16a34a" }}>
                    Use Recommendation <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Recommended Vehicle */}
                <div className="bg-white rounded-xl" style={{ border: "1px solid #e2e8f0" }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid #f1f5f9", background: "#f8fafc", borderRadius: "12px 12px 0 0" }}>
                    <Car className="w-4 h-4" style={{ color: "#2563eb" }} />
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>Top Ranked Vehicles</p>
                  </div>
                  <div className="divide-y" style={{ borderColor: "#f8fafc" }}>
                    {result.vehicles.map((v, i) => (
                      <button key={v.id} onClick={() => setSelectedVehicle(v)} className="w-full px-4 py-3 text-left transition-colors hover:bg-blue-50" style={{ background: selectedVehicle?.id === v.id ? "#eff6ff" : "white" }}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              {i === 0 && <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: "#fef3c7", color: "#92400e" }}>★ Best</span>}
                              <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{v.name}</p>
                            </div>
                            <p className="text-xs" style={{ color: "#94a3b8" }}>{v.registrationNumber} · {v.type} · {v.region}</p>
                          </div>
                          <span className="text-lg font-bold" style={{ color: "#2563eb" }}>{v.vehicleScore}</span>
                        </div>
                        <div className="space-y-1.5">
                          <ScoreBar label={`Capacity Fit (${v.capacityUtilization}%)`} score={v.capacityFit} color="#2563eb" icon={CheckCircle2} />
                          <ScoreBar label={`Fuel (${v.fuelEfficiency ?? "N/A"} km/L)`} score={v.fuelScore} color="#16a34a" icon={Fuel} />
                          <ScoreBar label="Maintenance" score={v.maintenanceScore} color="#f59e0b" icon={Wrench} />
                          <ScoreBar label="Availability" score={v.availabilityScore} color="#8b5cf6" icon={TrendingUp} />
                        </div>
                        <p className="text-xs mt-1.5" style={{ color: "#94a3b8" }}>Cap: {v.maximumLoadCapacity}T · Odo: {v.odometer.toLocaleString("en-IN")} km</p>
                      </button>
                    ))}
                    {result.vehicles.length === 0 && (
                      <p className="px-4 py-6 text-sm text-center" style={{ color: "#94a3b8" }}>No eligible vehicles for this cargo weight</p>
                    )}
                  </div>
                </div>

                {/* Recommended Driver */}
                <div className="bg-white rounded-xl" style={{ border: "1px solid #e2e8f0" }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid #f1f5f9", background: "#f8fafc", borderRadius: "12px 12px 0 0" }}>
                    <Users className="w-4 h-4" style={{ color: "#7c3aed" }} />
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>Top Ranked Drivers</p>
                  </div>
                  <div className="divide-y" style={{ borderColor: "#f8fafc" }}>
                    {result.drivers.map((d, i) => (
                      <button key={d.id} onClick={() => setSelectedDriver(d)} className="w-full px-4 py-3 text-left transition-colors hover:bg-purple-50" style={{ background: selectedDriver?.id === d.id ? "#faf5ff" : "white" }}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              {i === 0 && <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: "#fef3c7", color: "#92400e" }}>★ Best</span>}
                              <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{d.name}</p>
                            </div>
                            <p className="text-xs" style={{ color: "#94a3b8" }}>{d.licenseCategory} · {d.licenseNumber}</p>
                          </div>
                          <span className="text-lg font-bold" style={{ color: "#7c3aed" }}>{d.driverScore}</span>
                        </div>
                        <div className="space-y-1.5">
                          <ScoreBar label={`Safety (${d.safetyScore}/100)`} score={d.safetyScore} color="#7c3aed" icon={CheckCircle2} />
                          <ScoreBar label={`License (${d.licenseState})`} score={d.licenseScore} color={LICENSE_COLOR[d.licenseState] ?? "#94a3b8"} icon={CheckCircle2} />
                          <ScoreBar label="Availability" score={100} color="#0891b2" icon={TrendingUp} />
                        </div>
                        <p className="text-xs mt-1.5" style={{ color: LICENSE_COLOR[d.licenseState] }}>
                          {d.licenseState === "EXPIRING_SOON" ? `⚠ Expires in ${d.daysUntilExpiry} days` : `${d.daysUntilExpiry} days until expiry`}
                        </p>
                      </button>
                    ))}
                    {result.drivers.length === 0 && (
                      <p className="px-4 py-6 text-sm text-center" style={{ color: "#94a3b8" }}>No eligible drivers available</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Rejected */}
              {(result.rejectedVehicles.length > 0 || result.rejectedDrivers.length > 0) && (
                <div className="bg-white rounded-xl" style={{ border: "1px solid #fecaca" }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid #fef2f2", background: "#fff5f5", borderRadius: "12px 12px 0 0" }}>
                    <XCircle className="w-4 h-4 text-red-500" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Rejected — Eligibility Failures</p>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.rejectedVehicles.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: "#64748b" }}>Vehicles ({result.rejectedVehicles.length})</p>
                        {result.rejectedVehicles.map(v => (
                          <div key={v.registrationNumber} className="flex items-start gap-2 mb-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium" style={{ color: "#0f172a" }}>{v.name} <span style={{ color: "#94a3b8" }}>({v.registrationNumber})</span></p>
                              <p className="text-xs" style={{ color: "#dc2626" }}>{v.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {result.rejectedDrivers.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: "#64748b" }}>Drivers ({result.rejectedDrivers.length})</p>
                        {result.rejectedDrivers.map(d => (
                          <div key={d.licenseNumber} className="flex items-start gap-2 mb-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium" style={{ color: "#0f172a" }}>{d.name}</p>
                              <p className="text-xs" style={{ color: "#dc2626" }}>{d.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Use recommendation CTA */}
              {vehicle && driver && (
                <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">Ready to Dispatch</p>
                      <p className="text-xs text-green-700">{vehicle.name} with {driver.name} — Confidence {result.recommended.confidence}%</p>
                    </div>
                  </div>
                  <button onClick={useRecommendation} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: "#16a34a" }}>
                    Use Recommendation <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
