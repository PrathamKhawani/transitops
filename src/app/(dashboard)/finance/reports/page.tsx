"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/AppHeader";
import { Download, FileText, Filter, Calendar, Truck } from "lucide-react";

const VEHICLE_TYPES = ["", "Heavy Truck", "Medium Truck", "Mini Truck", "Van", "Bus", "Tanker"];
const REGIONS = ["", "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Bhavnagar", "Jamnagar"];

const REPORT_TYPES = [
  { id: "fleet", label: "Fleet Performance", desc: "Vehicle trips, distance, revenue vs acquisition cost" },
  { id: "fuel", label: "Fuel Efficiency", desc: "Fuel consumption, cost, and km/L per vehicle" },
  { id: "cost", label: "Operational Cost", desc: "Fuel + maintenance + other expenses per vehicle" },
  { id: "roi", label: "Vehicle ROI", desc: "Return on Investment — revenue vs total costs" },
];

interface Vehicle { id: string; name: string; registrationNumber: string; }

export default function ReportsPage() {
  const [reportType, setReportType] = useState("fleet");
  const [vehicleId, setVehicleId] = useState("");
  const [region, setRegion] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : []));
  }, []);

  function handleDownload() {
    setDownloading(true);
    const params = new URLSearchParams({ type: reportType });
    if (vehicleId) params.set("vehicleId", vehicleId);
    if (region) params.set("region", region);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    const a = document.createElement("a");
    a.href = `/api/reports?${params}`;
    a.download = `${reportType}_report.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setDownloading(false), 800);
  }

  return (
    <div style={{ padding: "36px 44px" }}>
      <PageHeader title="Reports" description="Export real operational data as CSV for analysis" breadcrumb="Financial Analyst" />

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
        {/* Filters */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Filter style={{ width: 14, height: 14, color: "#2563EB" }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#18181B", letterSpacing: "-0.01em" }}>Report Filters</p>
              <p style={{ fontSize: 12, color: "#A1A1AA", marginTop: 1 }}>Narrow down your export</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#71717A", marginBottom: 5 }}>Report Type *</label>
              <select value={reportType} onChange={e => setReportType(e.target.value)} className="input-field">
                {REPORT_TYPES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <p style={{ fontSize: 11, marginTop: 4, color: "#A1A1AA" }}>{REPORT_TYPES.find(r => r.id === reportType)?.desc}</p>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#71717A", marginBottom: 5 }}>Vehicle (optional)</label>
              <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} className="input-field">
                <option value="">All Vehicles</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber})</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#71717A", marginBottom: 5 }}>Region (optional)</label>
              <select value={region} onChange={e => setRegion(e.target.value)} className="input-field">
                {REGIONS.map(r => <option key={r} value={r}>{r || "All Regions"}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#71717A", marginBottom: 5 }}>
                <Calendar style={{ width: 12, height: 12 }} /> Date Range (optional)
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field" style={{ fontSize: 12 }} />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field" style={{ fontSize: 12 }} />
              </div>
            </div>

            <button onClick={handleDownload} disabled={downloading} className="btn btn-primary" style={{ justifyContent: "center", marginTop: 4 }}>
              <Download style={{ width: 14, height: 14 }} />
              {downloading ? "Preparing CSV..." : "Download CSV"}
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Report type selector cards */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #F4F4F5" }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#18181B" }}>Available Reports</p>
            </div>
            <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {REPORT_TYPES.map(r => (
                <button
                  key={r.id}
                  onClick={() => setReportType(r.id)}
                  style={{
                    textAlign: "left", padding: "14px 16px", borderRadius: 10,
                    border: `1px solid ${reportType === r.id ? "#2563EB" : "#E4E4E7"}`,
                    background: reportType === r.id ? "#EFF6FF" : "#FAFAFA",
                    cursor: "pointer", transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "start", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: reportType === r.id ? "#DBEAFE" : "#F4F4F5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <FileText style={{ width: 15, height: 15, color: reportType === r.id ? "#2563EB" : "#A1A1AA" }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#18181B", marginBottom: 2 }}>{r.label}</p>
                      <p style={{ fontSize: 11, color: "#71717A", lineHeight: 1.4 }}>{r.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Report details */}
          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Truck style={{ width: 14, height: 14, color: "#71717A" }} />
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#A1A1AA" }}>Report Details</p>
            </div>
            {reportType === "fleet" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {["Vehicle, Registration, Type, Region, Status", "Odometer reading, Trips completed", "Total distance (km), Total revenue (₹)", "Acquisition cost (₹)"].map(s => (
                  <p key={s} style={{ fontSize: 12, color: "#3F3F46" }}>• {s}</p>
                ))}
                <p style={{ fontSize: 11, color: "#A1A1AA", marginTop: 4 }}>Filters: Vehicle, Region, Date Range (completion date)</p>
              </div>
            )}
            {reportType === "fuel" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {["Date, Vehicle, Registration, Region", "Trip code, Litres, Cost (₹)", "Odometer reading, Fuel efficiency (km/L)"].map(s => (
                  <p key={s} style={{ fontSize: 12, color: "#3F3F46" }}>• {s}</p>
                ))}
                <p style={{ fontSize: 11, color: "#A1A1AA", marginTop: 4 }}>Filters: Vehicle, Date Range</p>
              </div>
            )}
            {reportType === "cost" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {["Vehicle, Registration, Type, Region", "Fuel cost, Maintenance cost, Other expenses", "Total operational cost (₹)"].map(s => (
                  <p key={s} style={{ fontSize: 12, color: "#3F3F46" }}>• {s}</p>
                ))}
                <p style={{ fontSize: 11, color: "#A1A1AA", marginTop: 4 }}>Filters: Vehicle, Region, Date Range</p>
              </div>
            )}
            {reportType === "roi" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {["Vehicle, Registration, Type, Region", "Acquisition cost, Revenue, Maintenance, Fuel", "Net Contribution (₹), ROI (%)"].map(s => (
                  <p key={s} style={{ fontSize: 12, color: "#3F3F46" }}>• {s}</p>
                ))}
                <p style={{ fontSize: 11, color: "#A1A1AA", marginTop: 4 }}>ROI = (Revenue − Maintenance − Fuel) / Acq. Cost × 100</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
