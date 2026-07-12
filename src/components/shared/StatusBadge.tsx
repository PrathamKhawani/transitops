import { cn } from "@/lib/utils";

type StatusVariant =
  | "AVAILABLE" | "ON_TRIP" | "IN_SHOP" | "RETIRED"
  | "DRAFT" | "DISPATCHED" | "COMPLETED" | "CANCELLED"
  | "SUSPENDED" | "OFF_DUTY"
  | "SCHEDULED" | "IN_PROGRESS"
  | "VALID" | "EXPIRING" | "EXPIRED";

const STATUS_CONFIG: Record<StatusVariant, { label: string; bg: string; text: string; dot: string }> = {
  AVAILABLE:   { label: "Available",   bg: "#f0fdf4", text: "#15803d", dot: "#22c55e" },
  ON_TRIP:     { label: "On Trip",     bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6" },
  IN_SHOP:     { label: "In Shop",     bg: "#fff7ed", text: "#c2410c", dot: "#f97316" },
  RETIRED:     { label: "Retired",     bg: "#f8fafc", text: "#64748b", dot: "#94a3b8" },
  DRAFT:       { label: "Draft",       bg: "#f8fafc", text: "#475569", dot: "#94a3b8" },
  DISPATCHED:  { label: "Dispatched",  bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6" },
  COMPLETED:   { label: "Completed",   bg: "#f0fdf4", text: "#15803d", dot: "#22c55e" },
  CANCELLED:   { label: "Cancelled",   bg: "#fef2f2", text: "#dc2626", dot: "#ef4444" },
  SUSPENDED:   { label: "Suspended",   bg: "#fef2f2", text: "#dc2626", dot: "#ef4444" },
  OFF_DUTY:    { label: "Off Duty",    bg: "#f8fafc", text: "#64748b", dot: "#94a3b8" },
  SCHEDULED:   { label: "Scheduled",   bg: "#faf5ff", text: "#7c3aed", dot: "#8b5cf6" },
  IN_PROGRESS: { label: "In Progress", bg: "#fff7ed", text: "#c2410c", dot: "#f97316" },
  VALID:       { label: "Valid",       bg: "#f0fdf4", text: "#15803d", dot: "#22c55e" },
  EXPIRING:    { label: "Expiring",    bg: "#fefce8", text: "#a16207", dot: "#eab308" },
  EXPIRED:     { label: "Expired",     bg: "#fef2f2", text: "#dc2626", dot: "#ef4444" },
};

interface StatusBadgeProps {
  status: StatusVariant | string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as StatusVariant] || {
    label: status,
    bg: "#f8fafc",
    text: "#64748b",
    dot: "#94a3b8",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
      )}
      style={{ background: config.bg, color: config.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: config.dot }} />
      {config.label}
    </span>
  );
}
