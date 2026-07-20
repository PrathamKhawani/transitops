"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";

const VEHICLE_TYPES = ["Heavy Truck", "Medium Truck", "Mini Truck", "Van", "Bus", "Tanker"];
const REGIONS = ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Bhavnagar", "Jamnagar"];
const STATUSES = ["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"];
const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  ON_TRIP: "On Trip",
  IN_SHOP: "In Shop",
  RETIRED: "Retired",
};

const selectStyle = (active: boolean): React.CSSProperties => ({
  fontSize: 13,
  fontWeight: 400,
  padding: "6px 10px",
  borderRadius: 7,
  border: `1px solid ${active ? "#DBEAFE" : "#E4E4E7"}`,
  background: active ? "#EFF6FF" : "#FFFFFF",
  color: active ? "#1D4ED8" : "#3F3F46",
  outline: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "all 0.15s ease",
  appearance: "none" as const,
  WebkitAppearance: "none" as const,
});

export function FleetFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const type   = searchParams.get("type")   || "";
  const status = searchParams.get("status") || "";
  const region = searchParams.get("region") || "";
  const hasFilters = !!(type || status || region);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`);
  }

  function clearAll() { router.push("?"); }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 10,
        background: "#FFFFFF",
        border: "1px solid #E4E4E7",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      {/* Label */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <SlidersHorizontal style={{ width: 13, height: 13, color: "#A1A1AA" }} />
        <span style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Filter
        </span>
      </div>

      <div style={{ width: 1, height: 18, background: "#E4E4E7" }} />

      {/* Type */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: "#71717A" }}>Type</label>
        <select value={type} onChange={(e) => updateFilter("type", e.target.value)} style={selectStyle(!!type)}>
          <option value="">All Types</option>
          {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Status */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: "#71717A" }}>Status</label>
        <select value={status} onChange={(e) => updateFilter("status", e.target.value)} style={selectStyle(!!status)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
        </select>
      </div>

      {/* Region */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: "#71717A" }}>Region</label>
        <select value={region} onChange={(e) => updateFilter("region", e.target.value)} style={selectStyle(!!region)}>
          <option value="">All Regions</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Clear */}
      {hasFilters && (
        <>
          <div style={{ width: 1, height: 18, background: "#E4E4E7" }} />
          <button
            onClick={clearAll}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              fontWeight: 500,
              color: "#EF4444",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontFamily: "inherit",
            }}
          >
            <X style={{ width: 12, height: 12 }} />
            Clear
          </button>
        </>
      )}
    </div>
  );
}
