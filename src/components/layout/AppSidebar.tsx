"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Truck, LayoutDashboard, Car, Users, MapPin, Wrench,
  ShieldCheck, DollarSign, Fuel, Receipt, LogOut, ChevronRight,
  Zap, BarChart2, FileDown, Settings
} from "lucide-react";
import { Role } from "@prisma/client";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  FLEET_MANAGER: [
    { label: "Dashboard", href: "/fleet", icon: LayoutDashboard },
    { label: "Vehicles", href: "/fleet/vehicles", icon: Car },
    { label: "Maintenance", href: "/fleet/maintenance", icon: Wrench },
    { label: "Drivers", href: "/fleet/drivers", icon: Users },
  ],
  DISPATCHER: [
    { label: "Dashboard", href: "/dispatch", icon: LayoutDashboard },
    { label: "Smart Dispatch", href: "/dispatch/smart-dispatch", icon: Zap },
    { label: "Trips", href: "/dispatch/trips", icon: MapPin },
    { label: "Vehicles", href: "/dispatch/vehicles", icon: Car },
    { label: "Drivers", href: "/dispatch/drivers", icon: Users },
  ],
  SAFETY_OFFICER: [
    { label: "Dashboard", href: "/safety", icon: LayoutDashboard },
    { label: "Drivers", href: "/safety/drivers", icon: Users },
    { label: "Compliance", href: "/safety/compliance", icon: ShieldCheck },
  ],
  FINANCIAL_ANALYST: [
    { label: "Dashboard", href: "/finance", icon: LayoutDashboard },
    { label: "Analytics", href: "/finance/analytics", icon: BarChart2 },
    { label: "Reports", href: "/finance/reports", icon: FileDown },
    { label: "Fuel Logs", href: "/finance/fuel", icon: Fuel },
    { label: "Expenses", href: "/finance/expenses", icon: Receipt },
    { label: "Revenue", href: "/finance/revenue", icon: DollarSign },
  ],
};

const ROLE_LABELS: Record<Role, string> = {
  FLEET_MANAGER: "Fleet Manager",
  DISPATCHER: "Dispatcher",
  SAFETY_OFFICER: "Safety Officer",
  FINANCIAL_ANALYST: "Financial Analyst",
};

const ROLE_COLORS: Record<Role, string> = {
  FLEET_MANAGER: "#3b82f6",
  DISPATCHER: "#10b981",
  SAFETY_OFFICER: "#f59e0b",
  FINANCIAL_ANALYST: "#8b5cf6",
};

interface AppSidebarProps {
  user: { name: string; email: string; role: Role };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = NAV_BY_ROLE[user.role] || [];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Logged out successfully");
    router.push("/login");
  }

  return (
    <aside
      className="flex flex-col w-60 min-h-screen flex-shrink-0"
      style={{ background: "#0f172a", borderRight: "1px solid #1e293b" }}
    >
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5" style={{ borderBottom: "1px solid #1e293b" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#2563eb" }}>
          <Truck className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">TransitOps</p>
          <p className="text-xs" style={{ color: "#475569" }}>Operations Platform</p>
        </div>
      </div>

      {/* Role Badge */}
      <div className="px-5 py-3" style={{ borderBottom: "1px solid #1e293b" }}>
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
          style={{ background: ROLE_COLORS[user.role] + "20", color: ROLE_COLORS[user.role] }}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: ROLE_COLORS[user.role] }} />
          {ROLE_LABELS[user.role]}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href) && item.href !== navItems[0].href) || pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors group"
              style={{
                color: isActive ? "#f8fafc" : "#64748b",
                background: isActive ? "#1e293b" : "transparent",
              }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3" style={{ color: "#3b82f6" }} />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 pb-2" style={{ borderTop: "1px solid #1e293b", paddingTop: "8px" }}>
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ color: pathname === "/settings" ? "#f8fafc" : "#64748b", background: pathname === "/settings" ? "#1e293b" : "transparent" }}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">Settings</span>
          {pathname === "/settings" && <ChevronRight className="w-3 h-3" style={{ color: "#3b82f6" }} />}
        </Link>
      </div>
      <div className="px-3 py-3" style={{ borderTop: "1px solid #1e293b" }}>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: "#1e293b" }}>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: ROLE_COLORS[user.role] }}
          >
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user.name}</p>
            <p className="text-xs truncate" style={{ color: "#475569" }}>{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1 rounded hover:bg-red-500/20 transition-colors"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" style={{ color: "#64748b" }} />
          </button>
        </div>
      </div>
    </aside>
  );
}
