import { cn } from "@/lib/utils";

type StatusVariant =
  | "AVAILABLE" | "ON_TRIP" | "IN_SHOP" | "RETIRED"
  | "DRAFT" | "DISPATCHED" | "COMPLETED" | "CANCELLED"
  | "SUSPENDED" | "OFF_DUTY"
  | "SCHEDULED" | "IN_PROGRESS"
  | "VALID" | "EXPIRING" | "EXPIRED";

const STATUS_CONFIG: Record<StatusVariant, { label: string; bg: string; text: string; dot: string; border: string }> = {
  AVAILABLE:   { label: "Available",   bg: "#ECFDF5", text: "#059669", dot: "#10B981", border: "#D1FAE5" },
  ON_TRIP:     { label: "On Trip",     bg: "#EFF6FF", text: "#1D4ED8", dot: "#2563EB", border: "#DBEAFE" },
  IN_SHOP:     { label: "In Shop",     bg: "#FFFBEB", text: "#D97706", dot: "#F59E0B", border: "#FDE68A" },
  RETIRED:     { label: "Retired",     bg: "#F8FAFC", text: "#64748B", dot: "#94A3B8", border: "#E2E8F0" },
  DRAFT:       { label: "Draft",       bg: "#F8FAFC", text: "#475569", dot: "#94A3B8", border: "#E2E8F0" },
  DISPATCHED:  { label: "Dispatched",  bg: "#EFF6FF", text: "#1D4ED8", dot: "#2563EB", border: "#DBEAFE" },
  COMPLETED:   { label: "Completed",   bg: "#ECFDF5", text: "#059669", dot: "#10B981", border: "#D1FAE5" },
  CANCELLED:   { label: "Cancelled",   bg: "#FEF2F2", text: "#DC2626", dot: "#EF4444", border: "#FEE2E2" },
  SUSPENDED:   { label: "Suspended",   bg: "#FEF2F2", text: "#DC2626", dot: "#EF4444", border: "#FEE2E2" },
  OFF_DUTY:    { label: "Off Duty",    bg: "#F8FAFC", text: "#64748B", dot: "#94A3B8", border: "#E2E8F0" },
  SCHEDULED:   { label: "Scheduled",   bg: "#F5F3FF", text: "#6D28D9", dot: "#8B5CF6", border: "#EDE9FE" },
  IN_PROGRESS: { label: "In Progress", bg: "#FFFBEB", text: "#D97706", dot: "#F59E0B", border: "#FDE68A" },
  VALID:       { label: "Valid",       bg: "#ECFDF5", text: "#059669", dot: "#10B981", border: "#D1FAE5" },
  EXPIRING:    { label: "Expiring",    bg: "#FEFCE8", text: "#A16207", dot: "#EAB308", border: "#FEF08A" },
  EXPIRED:     { label: "Expired",     bg: "#FEF2F2", text: "#DC2626", dot: "#EF4444", border: "#FEE2E2" },
};

interface StatusBadgeProps {
  status: StatusVariant | string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as StatusVariant] || {
    label: status,
    bg: "#F8FAFC",
    text: "#64748B",
    dot: "#94A3B8",
    border: "#E2E8F0",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-[11px]"
      )}
      style={{
        background: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
      }}
    >
      <span
        className="rounded-full flex-shrink-0"
        style={{
          width: size === "sm" ? 5 : 6,
          height: size === "sm" ? 5 : 6,
          background: config.dot,
        }}
      />
      {config.label}
    </span>
  );
}
