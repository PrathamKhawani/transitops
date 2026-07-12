import { ReactNode } from "react";
import { Search, Bell } from "lucide-react";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AppHeader({ title, subtitle, actions }: AppHeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-6 py-4 bg-white"
      style={{ borderBottom: "1px solid #e2e8f0", minHeight: "64px" }}
    >
      <div>
        <h1 className="text-base font-semibold" style={{ color: "#0f172a" }}>{title}</h1>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{subtitle}</p>}
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
}

export function PageHeader({ title, description, actions, breadcrumb }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        {breadcrumb && (
          <p className="text-xs mb-1" style={{ color: "#94a3b8" }}>{breadcrumb}</p>
        )}
        <h2 className="text-xl font-semibold" style={{ color: "#0f172a" }}>{title}</h2>
        {description && (
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0 ml-4">{actions}</div>}
    </div>
  );
}
