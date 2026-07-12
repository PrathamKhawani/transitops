import { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  accent?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "#2563eb",
  iconBg = "#eff6ff",
  trend,
  trendValue,
  accent,
}: KpiCardProps) {
  return (
    <div
      className="bg-white rounded-xl p-5"
      style={{ border: "1px solid #e2e8f0", ...(accent ? { borderTop: `3px solid ${accent}` } : {}) }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#64748b" }}>
            {title}
          </p>
          <p className="text-2xl font-bold mt-1.5" style={{ color: "#0f172a" }}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-2">
              {trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-500" />}
              {trend === "down" && <TrendingDown className="w-3 h-3 text-red-500" />}
              {trend === "neutral" && <Minus className="w-3 h-3" style={{ color: "#94a3b8" }} />}
              <span
                className="text-xs font-medium"
                style={{ color: trend === "up" ? "#10b981" : trend === "down" ? "#ef4444" : "#94a3b8" }}
              >
                {trendValue}
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: iconBg }}
          >
            <Icon className="w-4.5 h-4.5" style={{ color: iconColor }} />
          </div>
        )}
      </div>
    </div>
  );
}
