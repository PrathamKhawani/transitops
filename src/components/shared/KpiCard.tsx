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
  highlighted?: boolean;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "#2563EB",
  iconBg = "#EFF6FF",
  trend,
  trendValue,
  accent,
  highlighted = false,
}: KpiCardProps) {
  return (
    <div
      className="card animate-fade-in-up"
      style={{
        padding: "18px 20px",
        ...(accent
          ? { borderTop: `3px solid ${accent}` }
          : highlighted
          ? { borderLeft: "3px solid #2563EB" }
          : {}),
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p
            className="text-[11px] font-semibold uppercase tracking-wider mb-2"
            style={{ color: "#94A3B8", letterSpacing: "0.08em" }}
          >
            {title}
          </p>
          <p
            className="font-extrabold"
            style={{
              fontSize: 26,
              color: "#0A1628",
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs mt-1.5" style={{ color: "#94A3B8" }}>
              {subtitle}
            </p>
          )}
          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-2">
              {trend === "up" && (
                <TrendingUp className="w-3 h-3" style={{ color: "#10B981" }} />
              )}
              {trend === "down" && (
                <TrendingDown className="w-3 h-3" style={{ color: "#EF4444" }} />
              )}
              {trend === "neutral" && (
                <Minus className="w-3 h-3" style={{ color: "#94A3B8" }} />
              )}
              <span
                className="text-xs font-semibold"
                style={{
                  color:
                    trend === "up"
                      ? "#10B981"
                      : trend === "down"
                      ? "#EF4444"
                      : "#94A3B8",
                }}
              >
                {trendValue}
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ml-3"
            style={{ background: iconBg }}
          >
            <Icon className="w-4 h-4" style={{ color: iconColor }} />
          </div>
        )}
      </div>
    </div>
  );
}
