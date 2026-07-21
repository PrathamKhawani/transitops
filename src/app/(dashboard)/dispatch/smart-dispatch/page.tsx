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
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Icon style={{ width: 13, height: 13, flexShrink: 0, color }} />
      <span style={{ fontSize: 11, color: "#71717A", width: 112, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 4, borderRadius: 100, background: "#F4F4F5", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 100, background: color, width: `${score}%`, transition: "width 0.5s ease" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, width: 28, textAlign: "right", color, flexShrink: 0 }}>{score}</span>
    </div>
  );
}

const CONFIDENCE_COLOR = (c: number) => c >= 80 ? "#059669" : c >= 60 ? "#D97706" : "#DC2626";
const CONFIDENCE_LABEL = (c: number) => c >= 80 ? "High Confidence" : c >= 60 ? "Moderate" : "Low Confidence";
const CONFIDENCE_BG = (c: number) => c >= 80 ? "#ECFDF5" : c >= 60 ? "#FFFBEB" : "#FEF2F2";
const CONFIDENCE_BORDER = (c: number) => c >= 80 ? "#D1FAE5" : c >= 60 ? "#FDE68A" : "#FEE2E2";

const LICENSE_COLOR: Record<string, string> = { VALID: "#059669", EXPIRING_SOON: "#D97706", EXPIRED: "#DC2626" };

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
    <div style={{ padding: "36px 44px" }}>
      <PageHeader
        title="Smart Dispatch"
        description="Deterministic recommendation engine — Capacity Fit 35% · Fuel Efficiency 30% · Maintenance Reliability 20% · Availability 15%"
        breadcrumb="Dispatcher"
      />

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
        {/* ── Input Form ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Zap style={{ width: 15, height: 15, color: "#2563EB" }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#18181B", letterSpacing: "-0.01em" }}>Smart Dispatch Input</p>
                <p style={{ fontSize: 12, color: "#A1A1AA", marginTop: 1 }}>Enter cargo & distance details</p>
              </div>
            </div>
            <form onSubmit={runRecommendation} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#71717A", marginBottom: 5 }}>From</label>
                  <input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="Ahmedabad" className="input-field" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#71717A", marginBottom: 5 }}>To</label>
                  <input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} placeholder="Surat" className="input-field" />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#71717A", marginBottom: 5 }}>Cargo Weight (T) *</label>
                <input required type="number" step="0.01" min="0.01" value={form.cargoWeight} onChange={e => setForm({ ...form, cargoWeight: e.target.value })} placeholder="0.45" className="input-field" />
                <p style={{ fontSize: 11, marginTop: 4, color: "#A1A1AA" }}>e.g. 0.45 = 450 kg · 28 = 28 tonnes</p>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#71717A", marginBottom: 5 }}>Planned Distance (km) *</label>
                <input required type="number" min="1" value={form.plannedDistance} onChange={e => setForm({ ...form, plannedDistance: e.target.value })} placeholder="265" className="input-field" />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ justifyContent: "center", marginTop: 4 }}>
                {loading
                  ? <><div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.75s linear infinite" }} /> Analyzing...</>
                  : <><Zap style={{ width: 14, height: 14 }} /> Run Smart Dispatch</>
                }
              </button>
            </form>
          </div>

          {/* Scoring legend */}
          <div className="card" style={{ padding: "18px 20px" }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#A1A1AA", marginBottom: 12 }}>Scoring Weights</p>
            {[
              { label: "Capacity Fit", weight: "35%", color: "#2563EB" },
              { label: "Fuel Efficiency", weight: "30%", color: "#10B981" },
              { label: "Maintenance Reliability", weight: "20%", color: "#F59E0B" },
              { label: "Availability", weight: "15%", color: "#8B5CF6" },
            ].map(i => (
              <div key={i.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: i.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#3F3F46" }}>{i.label}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: i.color }}>{i.weight}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid #F4F4F5", marginTop: 8, paddingTop: 8 }}>
              <p style={{ fontSize: 11, color: "#71717A" }}>Driver: Safety 50% · License 30% · Availability 20%</p>
            </div>
          </div>
        </div>

        {/* ── Results ── */}
        <div>
          {!result && !loading && (
            <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px" }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "#F4F4F5", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Zap style={{ width: 20, height: 20, color: "#D4D4D8" }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#A1A1AA" }}>Enter cargo weight and distance to get a recommendation</p>
              <p style={{ fontSize: 12, color: "#D4D4D8", marginTop: 4 }}>The engine will score all eligible vehicles and drivers</p>
            </div>
          )}

          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Confidence + Use button */}
              <div className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: CONFIDENCE_BG(result.recommended.confidence), border: `1px solid ${CONFIDENCE_BORDER(result.recommended.confidence)}` }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: CONFIDENCE_COLOR(result.recommended.confidence) }} />
                    <p style={{ fontSize: 14, fontWeight: 600, color: CONFIDENCE_COLOR(result.recommended.confidence) }}>
                      {CONFIDENCE_LABEL(result.recommended.confidence)} — {result.recommended.confidence}%
                    </p>
                  </div>
                  <p style={{ fontSize: 12, color: "#71717A" }}>
                    Cargo: <strong>{result.inputs.cargoWeight}T</strong> · Distance: <strong>{result.inputs.plannedDistance} km</strong> · Fleet avg efficiency: <strong>{result.fleetAvgEfficiency} km/L</strong>
                  </p>
                  <p style={{ fontSize: 11, marginTop: 3, color: "#A1A1AA" }}>
                    {result.vehicles.length} eligible vehicle(s) · {result.drivers.length} eligible driver(s)
                  </p>
                </div>
                {result.recommended.vehicle && result.recommended.driver && (
                  <button onClick={useRecommendation} className="btn btn-primary" style={{ background: "#059669", flexShrink: 0 }}>
                    Use Recommendation <ArrowRight style={{ width: 14, height: 14 }} />
                  </button>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Recommended Vehicle */}
                <div className="card" style={{ overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #F4F4F5", background: "#FAFAFA" }}>
                    <Car style={{ width: 14, height: 14, color: "#2563EB" }} />
                    <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#71717A" }}>Top Ranked Vehicles</p>
                  </div>
                  <div>
                    {result.vehicles.map((v, i) => (
                      <button key={v.id} onClick={() => setSelectedVehicle(v)} style={{
                        width: "100%", padding: "14px 18px", textAlign: "left", background: selectedVehicle?.id === v.id ? "#EFF6FF" : "white",
                        border: "none", borderBottom: "1px solid #F4F4F5", cursor: "pointer", transition: "background 0.1s ease",
                      }}>
                        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: 10 }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                              {i === 0 && <span className="chip chip-amber" style={{ fontSize: 10, fontWeight: 600 }}>★ Best</span>}
                              <p style={{ fontSize: 13, fontWeight: 600, color: "#18181B" }}>{v.name}</p>
                            </div>
                            <p style={{ fontSize: 11, color: "#A1A1AA" }}>{v.registrationNumber} · {v.type} · {v.region}</p>
                          </div>
                          <span style={{ fontSize: 20, fontWeight: 700, color: "#2563EB", lineHeight: 1, flexShrink: 0 }}>{v.vehicleScore}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <ScoreBar label={`Capacity (${v.capacityUtilization}%)`} score={v.capacityFit} color="#2563EB" icon={CheckCircle2} />
                          <ScoreBar label={`Fuel (${v.fuelEfficiency ?? "N/A"} km/L)`} score={v.fuelScore} color="#10B981" icon={Fuel} />
                          <ScoreBar label="Maintenance" score={v.maintenanceScore} color="#F59E0B" icon={Wrench} />
                          <ScoreBar label="Availability" score={v.availabilityScore} color="#8B5CF6" icon={TrendingUp} />
                        </div>
                        <p style={{ fontSize: 11, marginTop: 8, color: "#A1A1AA" }}>Cap: {v.maximumLoadCapacity}T · Odo: {v.odometer.toLocaleString("en-IN")} km</p>
                      </button>
                    ))}
                    {result.vehicles.length === 0 && (
                      <p style={{ padding: "40px 18px", textAlign: "center", fontSize: 13, color: "#A1A1AA" }}>No eligible vehicles for this cargo weight</p>
                    )}
                  </div>
                </div>

                {/* Recommended Driver */}
                <div className="card" style={{ overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #F4F4F5", background: "#FAFAFA" }}>
                    <Users style={{ width: 14, height: 14, color: "#7C3AED" }} />
                    <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#71717A" }}>Top Ranked Drivers</p>
                  </div>
                  <div>
                    {result.drivers.map((d, i) => (
                      <button key={d.id} onClick={() => setSelectedDriver(d)} style={{
                        width: "100%", padding: "14px 18px", textAlign: "left", background: selectedDriver?.id === d.id ? "#F5F3FF" : "white",
                        border: "none", borderBottom: "1px solid #F4F4F5", cursor: "pointer", transition: "background 0.1s ease",
                      }}>
                        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: 10 }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                              {i === 0 && <span className="chip chip-amber" style={{ fontSize: 10, fontWeight: 600 }}>★ Best</span>}
                              <p style={{ fontSize: 13, fontWeight: 600, color: "#18181B" }}>{d.name}</p>
                            </div>
                            <p style={{ fontSize: 11, color: "#A1A1AA" }}>{d.licenseCategory} · {d.licenseNumber}</p>
                          </div>
                          <span style={{ fontSize: 20, fontWeight: 700, color: "#7C3AED", lineHeight: 1, flexShrink: 0 }}>{d.driverScore}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <ScoreBar label={`Safety (${d.safetyScore}/100)`} score={d.safetyScore} color="#7C3AED" icon={CheckCircle2} />
                          <ScoreBar label={`License (${d.licenseState})`} score={d.licenseScore} color={LICENSE_COLOR[d.licenseState] ?? "#A1A1AA"} icon={CheckCircle2} />
                          <ScoreBar label="Availability" score={100} color="#06B6D4" icon={TrendingUp} />
                        </div>
                        <p style={{ fontSize: 11, marginTop: 8, color: LICENSE_COLOR[d.licenseState] ?? "#A1A1AA" }}>
                          {d.licenseState === "EXPIRING_SOON" ? `⚠ Expires in ${d.daysUntilExpiry} days` : `${d.daysUntilExpiry} days until expiry`}
                        </p>
                      </button>
                    ))}
                    {result.drivers.length === 0 && (
                      <p style={{ padding: "40px 18px", textAlign: "center", fontSize: 13, color: "#A1A1AA" }}>No eligible drivers available</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Rejected */}
              {(result.rejectedVehicles.length > 0 || result.rejectedDrivers.length > 0) && (
                <div className="card" style={{ overflow: "hidden" }}>
                  <div style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #FEE2E2", background: "#FEF2F2" }}>
                    <XCircle style={{ width: 14, height: 14, color: "#DC2626" }} />
                    <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#DC2626" }}>Rejected — Eligibility Failures</p>
                  </div>
                  <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {result.rejectedVehicles.length > 0 && (
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: "#71717A", marginBottom: 8 }}>Vehicles ({result.rejectedVehicles.length})</p>
                        {result.rejectedVehicles.map(v => (
                          <div key={v.registrationNumber} style={{ display: "flex", alignItems: "start", gap: 8, marginBottom: 8 }}>
                            <AlertTriangle style={{ width: 13, height: 13, color: "#EF4444", flexShrink: 0, marginTop: 1 }} />
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 500, color: "#18181B" }}>{v.name} <span style={{ color: "#A1A1AA" }}>({v.registrationNumber})</span></p>
                              <p style={{ fontSize: 11, color: "#DC2626" }}>{v.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {result.rejectedDrivers.length > 0 && (
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: "#71717A", marginBottom: 8 }}>Drivers ({result.rejectedDrivers.length})</p>
                        {result.rejectedDrivers.map(d => (
                          <div key={d.licenseNumber} style={{ display: "flex", alignItems: "start", gap: 8, marginBottom: 8 }}>
                            <AlertTriangle style={{ width: 13, height: 13, color: "#EF4444", flexShrink: 0, marginTop: 1 }} />
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 500, color: "#18181B" }}>{d.name}</p>
                              <p style={{ fontSize: 11, color: "#DC2626" }}>{d.reason}</p>
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
                <div className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#ECFDF5", border: "1px solid #D1FAE5" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <CheckCircle2 style={{ width: 18, height: 18, color: "#10B981", flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#065F46" }}>Ready to Dispatch</p>
                      <p style={{ fontSize: 12, color: "#047857", marginTop: 2 }}>{vehicle.name} with {driver.name} — Confidence {result.recommended.confidence}%</p>
                    </div>
                  </div>
                  <button onClick={useRecommendation} className="btn btn-primary" style={{ background: "#059669", flexShrink: 0 }}>
                    Use Recommendation <ChevronRight style={{ width: 14, height: 14 }} />
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
