import { ReactNode } from "react";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AppHeader({ title, subtitle, actions }: AppHeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-8"
      style={{
        minHeight: "64px",
        background: "#FFFFFF",
        borderBottom: "1px solid #E4E4E7",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div>
        <h1
          className="font-semibold leading-tight"
          style={{ fontSize: 16, color: "#09090B", letterSpacing: "-0.015em" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: "#71717A" }}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 24px",
        background: "#FFFFFF",
        borderRadius: "14px",
        border: "1px solid #E4E4E7",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        marginBottom: "28px",
        gap: "16px",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {breadcrumb && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#2563EB",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                background: "#EFF6FF",
                padding: "2px 8px",
                borderRadius: "4px",
                border: "1px solid #DBEAFE",
                display: "inline-block",
              }}
            >
              {breadcrumb}
            </span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#09090B",
              letterSpacing: "-0.025em",
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {title}
          </h2>
          {badge && (
            <span
              className="chip"
              style={{
                background: `${badgeColor}14`,
                color: badgeColor,
                border: `1px solid ${badgeColor}30`,
                fontSize: 11.5,
                fontWeight: 600,
                padding: "3px 10px",
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p
            style={{
              fontSize: 13,
              color: "#71717A",
              marginTop: 4,
              lineHeight: 1.5,
              margin: "4px 0 0 0",
            }}
          >
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
