import { ReactNode } from "react";
import { Bell, Search } from "lucide-react";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AppHeader({ title, subtitle, actions }: AppHeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-6"
      style={{
        minHeight: "60px",
        background: "#FFFFFF",
        borderBottom: "1px solid #E4ECFB",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div>
        <h1
          className="font-semibold leading-tight"
          style={{ fontSize: 15, color: "#0A1628", letterSpacing: "-0.02em" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: "#6B87B0" }}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {actions}
      </div>
    </header>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: string;
  badge?: string;
  badgeColor?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  badge,
  badgeColor = "#2563EB",
}: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        {breadcrumb && (
          <p className="text-xs mb-1" style={{ color: "#94A3B8" }}>
            {breadcrumb}
          </p>
        )}
        <div className="flex items-center gap-3">
          <h2
            className="font-bold"
            style={{ fontSize: 20, color: "#0A1628", letterSpacing: "-0.025em" }}
          >
            {title}
          </h2>
          {badge && (
            <span
              className="chip"
              style={{
                background: `${badgeColor}12`,
                color: badgeColor,
                border: `1px solid ${badgeColor}25`,
                fontSize: 11,
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm mt-1" style={{ color: "#6B87B0" }}>
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {actions}
        </div>
      )}
    </div>
  );
}
