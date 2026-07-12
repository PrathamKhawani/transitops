"use client";

import { useRouter, useSearchParams } from "next/navigation";

const VEHICLE_TYPES = ["Heavy Truck", "Medium Truck", "Mini Truck", "Van", "Bus", "Tanker"];
const REGIONS = ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Bhavnagar", "Jamnagar"];
const STATUSES = ["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"];

export function FleetFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "";
  const region = searchParams.get("region") || "";

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3 mb-6 p-4 bg-white rounded-xl" style={{ border: "1px solid #e2e8f0" }}>
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-slate-500 uppercase">Type</label>
        <select 
          value={type} 
          onChange={(e) => updateFilter("type", e.target.value)}
          className="text-sm border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500"
        >
          <option value="">All Types</option>
          {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
        <select 
          value={status} 
          onChange={(e) => updateFilter("status", e.target.value)}
          className="text-sm border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-slate-500 uppercase">Region</label>
        <select 
          value={region} 
          onChange={(e) => updateFilter("region", e.target.value)}
          className="text-sm border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500"
        >
          <option value="">All Regions</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
    </div>
  );
}
