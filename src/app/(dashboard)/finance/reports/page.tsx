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
    <div className="p-6">
      <PageHeader title="Reports" description="Export real operational data as CSV for analysis" breadcrumb="Financial Analyst" />

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
        {/* Filters */}
        <div className="bg-white rounded-xl p-5" style={{ border: "1px solid #e2e8f0" }}>
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4" style={{ color: "#2563eb" }} />
            <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Report Filters</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Report Type *</label>
              <select value={reportType} onChange={e => setReportType(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }}>
                {REPORT_TYPES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>{REPORT_TYPES.find(r => r.id === reportType)?.desc}</p>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Vehicle (optional)</label>
              <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }}>
                <option value="">All Vehicles</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Region (optional)</label>
              <select value={region} onChange={e => setRegion(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }}>
                {REGIONS.map(r => <option key={r} value={r}>{r || "All Regions"}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: "#374151" }}>
                <Calendar className="w-3.5 h-3.5" /> Date Range (optional)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-2 py-2 text-xs border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-2 py-2 text-xs border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
              </div>
            </div>

            <button onClick={handleDownload} disabled={downloading} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60" style={{ background: "#2563eb" }}>
              <Download className="w-4 h-4" />
              {downloading ? "Preparing CSV..." : "Download CSV"}
            </button>
          </div>
        </div>

        {/* Report Preview */}
        <div className="bg-white rounded-xl" style={{ border: "1px solid #e2e8f0" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
            <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Available Reports</p>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {REPORT_TYPES.map(r => (
              <button key={r.id} onClick={() => setReportType(r.id)} className="text-left p-4 rounded-xl border transition-all" style={{ borderColor: reportType === r.id ? "#2563eb" : "#e2e8f0", background: reportType === r.id ? "#eff6ff" : "white" }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: reportType === r.id ? "#dbeafe" : "#f8fafc" }}>
                    <FileText className="w-4 h-4" style={{ color: reportType === r.id ? "#2563eb" : "#94a3b8" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{r.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{r.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="px-5 pb-5">
            <div className="rounded-xl p-4" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4" style={{ color: "#64748b" }} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>Report Details</p>
              </div>
              {reportType === "fleet" && (
                <div className="text-xs space-y-1" style={{ color: "#374151" }}>
                  <p>• Vehicle, Registration, Type, Region, Status</p>
                  <p>• Odometer reading, Trips completed</p>
                  <p>• Total distance (km), Total revenue (₹)</p>
                  <p>• Acquisition cost (₹)</p>
                  <p className="mt-2" style={{ color: "#94a3b8" }}>Filters: Vehicle, Region, Date Range (completion date)</p>
                </div>
              )}
              {reportType === "fuel" && (
                <div className="text-xs space-y-1" style={{ color: "#374151" }}>
                  <p>• Date, Vehicle, Registration, Region</p>
                  <p>• Trip code, Litres, Cost (₹)</p>
                  <p>• Odometer reading, Fuel efficiency (km/L)</p>
                  <p className="mt-2" style={{ color: "#94a3b8" }}>Filters: Vehicle, Date Range</p>
                </div>
              )}
              {reportType === "cost" && (
                <div className="text-xs space-y-1" style={{ color: "#374151" }}>
                  <p>• Vehicle, Registration, Type, Region</p>
                  <p>• Fuel cost, Maintenance cost, Other expenses</p>
                  <p>• Total operational cost (₹)</p>
                  <p className="mt-2" style={{ color: "#94a3b8" }}>Filters: Vehicle, Region, Date Range</p>
                </div>
              )}
              {reportType === "roi" && (
                <div className="text-xs space-y-1" style={{ color: "#374151" }}>
                  <p>• Vehicle, Registration, Type, Region</p>
                  <p>• Acquisition cost, Revenue, Maintenance, Fuel</p>
                  <p>• Net Contribution (₹), ROI (%)</p>
                  <p className="mt-2" style={{ color: "#94a3b8" }}>ROI = (Revenue − Maintenance − Fuel) / Acq. Cost × 100</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
