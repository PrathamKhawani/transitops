"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Truck, LayoutDashboard, Car, Users, MapPin, Wrench,
  ShieldCheck, DollarSign, Fuel, Receipt, LogOut,
  Zap, BarChart3, FileDown, Settings, ChevronRight,
  Activity, TrendingUp
} from "lucide-react";
import { Role } from "@prisma/client";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavGroup {
  groupLabel?: string;
  items: NavItem[];
}

const NAV_BY_ROLE: Record<Role, NavGroup[]> = {
  FLEET_MANAGER: [
    {
      items: [
        { label: "Dashboard", href: "/fleet", icon: LayoutDashboard },
      ]
    },
    {
      groupLabel: "Fleet",
      items: [
        { label: "Vehicles", href: "/fleet/vehicles", icon: Car },
        { label: "Maintenance", href: "/fleet/maintenance", icon: Wrench },
        { label: "Drivers", href: "/fleet/drivers", icon: Users },
      ]
    }
  ],
  DISPATCHER: [
    {
      items: [
        { label: "Dashboard", href: "/dispatch", icon: LayoutDashboard },
      ]
    },
    {
      groupLabel: "Operations",
      items: [
        { label: "Smart Dispatch", href: "/dispatch/smart-dispatch", icon: Zap },
        { label: "Trips", href: "/dispatch/trips", icon: MapPin },
        { label: "Vehicles", href: "/dispatch/vehicles", icon: Car },
        { label: "Drivers", href: "/dispatch/drivers", icon: Users },
      ]
    }
  ],
  SAFETY_OFFICER: [
    {
      items: [
        { label: "Dashboard", href: "/safety", icon: LayoutDashboard },
      ]
    },
    {
      groupLabel: "Compliance",
      items: [
        { label: "Drivers", href: "/safety/drivers", icon: Users },
        { label: "Compliance", href: "/safety/compliance", icon: ShieldCheck },
      ]
    }
  ],
  FINANCIAL_ANALYST: [
    {
      items: [
        { label: "Dashboard", href: "/finance", icon: LayoutDashboard },
      ]
    },
    {
      groupLabel: "Finance",
      items: [
        { label: "Analytics", href: "/finance/analytics", icon: BarChart3 },
        { label: "Reports", href: "/finance/reports", icon: FileDown },
        { label: "Fuel Logs", href: "/finance/fuel", icon: Fuel },
        { label: "Expenses", href: "/finance/expenses", icon: Receipt },
        { label: "Revenue", href: "/finance/revenue", icon: DollarSign },
      ]
    }
  ],
  PENDING: [],
};

const ROLE_CONFIG: Record<Role, {
  label: string;
  color: string;
  icon: React.ElementType;
}> = {
  FLEET_MANAGER: {
    label: "Fleet Manager",
    color: "#3B82F6",
    icon: Car,
  },
  DISPATCHER: {
    label: "Dispatcher",
    color: "#10B981",
    icon: Activity,
  },
  SAFETY_OFFICER: {
    label: "Safety Officer",
    color: "#F59E0B",
    icon: ShieldCheck,
  },
  FINANCIAL_ANALYST: {
    label: "Financial Analyst",
    color: "#06B6D4",
    icon: TrendingUp,
  },
  PENDING: {
    label: "Pending Approval",
    color: "#71717A",
    icon: LayoutDashboard,
  },
};

interface AppSidebarProps {
  user: { name: string; email: string; role: Role };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navGroups = NAV_BY_ROLE[user.role] || [];
  const roleConfig = ROLE_CONFIG[user.role];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Logged out successfully");
    router.push("/login");
  }

  const isActive = (href: string, isFirst: boolean) => {
    if (pathname === href) return true;
    if (isFirst) return false;
    return pathname.startsWith(href) && href !== "/";
  };

  return (
    <aside
      style={{
        width: 260,
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        background: "#09090B",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}
    >
      {/* ─── Logo ─── */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Truck style={{ width: 16, height: 16, color: "#09090B" }} />
          </div>
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#FFFFFF",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              TransitOps
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#52525B",
                marginTop: 2,
                letterSpacing: "-0.01em",
              }}
            >
              {roleConfig.label}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Navigation ─── */}
      <nav
        style={{
          flex: 1,
          padding: "12px 12px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.groupLabel && (
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "#3F3F46",
                  padding: "0 10px",
                  marginBottom: 4,
                }}
              >
                {group.groupLabel}
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {group.items.map((item, ii) => {
                const active = isActive(item.href, gi === 0 && ii === 0);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="nav-item"
                    style={{
                      color: active ? "#FFFFFF" : "#71717A",
                      background: active ? "rgba(255,255,255,0.08)" : "transparent",
                    }}
                  >
                    {active && (
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 2,
                          height: 16,
                          borderRadius: "0 2px 2px 0",
                          background: "#3B82F6",
                        }}
                      />
                    )}
                    <Icon
                      style={{
                        width: 15,
                        height: 15,
                        color: active ? "#FFFFFF" : "#52525B",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 13, fontWeight: active ? 500 : 400 }}>
                      {item.label}
                    </span>
                    {item.badge && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          padding: "1px 6px",
                          borderRadius: 100,
                          background: "rgba(59,130,246,0.15)",
                          color: "#60A5FA",
                          marginLeft: "auto",
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ─── Bottom ─── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Settings */}
        <div style={{ padding: "8px 12px 0" }}>
          <Link
            href="/settings"
            className="nav-item"
            style={{
              color: pathname === "/settings" ? "#FFFFFF" : "#71717A",
              background: pathname === "/settings" ? "rgba(255,255,255,0.08)" : "transparent",
            }}
          >
            <Settings
              style={{
                width: 15,
                height: 15,
                color: pathname === "/settings" ? "#FFFFFF" : "#52525B",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 13 }}>Settings</span>
          </Link>
        </div>

        {/* User */}
        <div style={{ padding: "8px 12px 12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 10px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "#27272A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#A1A1AA",
                fontSize: 11,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#E4E4E7",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  lineHeight: 1,
                }}
              >
                {user.name}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "#52525B",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginTop: 2,
                  lineHeight: 1,
                }}
              >
                {user.email}
              </p>
            </div>

            <button
              onClick={handleLogout}
              style={{
                width: 24,
                height: 24,
                borderRadius: 5,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.15s ease",
              }}
              title="Logout"
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.12)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <LogOut style={{ width: 13, height: 13, color: "#71717A" }} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
