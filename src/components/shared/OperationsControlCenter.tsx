"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle, AlertTriangle, ShieldAlert, ArrowRight } from "lucide-react";

export type AlertSeverity = "CRITICAL" | "WARNING" | "INFO";

export interface OpsAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  reason: string;
  entity: string;
  href?: string;
}

const SEVERITY_CONFIG = {
  CRITICAL: {
    icon: AlertCircle,
    iconColor: "#DC2626",
    bg: "#FEF2F2",
    border: "#FEE2E2",
    accentBar: "#EF4444",
    label: "Critical",
    chipClass: "chip-red",
  },
  WARNING: {
    icon: AlertTriangle,
    iconColor: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    accentBar: "#F59E0B",
    label: "Warning",
    chipClass: "chip-amber",
  },
  INFO: {
    icon: CheckCircle,
    iconColor: "#059669",
    bg: "#ECFDF5",
    border: "#D1FAE5",
    accentBar: "#10B981",
    label: "Info",
    chipClass: "chip-green",
  },
};

export function OperationsControlCenter({ alerts }: { alerts: OpsAlert[] }) {
  const criticalCount = alerts.filter((a) => a.severity === "CRITICAL").length;
  const warningCount = alerts.filter((a) => a.severity === "WARNING").length;
  const infoCount = alerts.filter((a) => a.severity === "INFO").length;

  if (alerts.length === 0) {
    return (
      <div className="card" style={{ overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 18px",
            borderBottom: "1px solid #E4E4E7",
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "#EFF6FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ShieldAlert style={{ width: 14, height: 14, color: "#3B82F6" }} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#18181B" }}>
              Operations Control
            </p>
            <p style={{ fontSize: 12, color: "#A1A1AA" }}>
              Real-time fleet alerting
            </p>
          </div>
        </div>
        <div style={{ padding: "40px 18px", textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "#ECFDF5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 10px",
            }}
          >
            <CheckCircle style={{ width: 18, height: 18, color: "#10B981" }} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#059669" }}>
            All Systems Operational
          </p>
          <p style={{ fontSize: 12, marginTop: 4, color: "#A1A1AA" }}>
            No active alerts — fleet is running smoothly
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          borderBottom: "1px solid #E4E4E7",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: criticalCount > 0 ? "#FEF2F2" : "#FFFBEB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ShieldAlert
              style={{
                width: 14,
                height: 14,
                color: criticalCount > 0 ? "#DC2626" : "#D97706",
              }}
            />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#18181B" }}>
              Operations Control
            </p>
            <p style={{ fontSize: 12, color: "#A1A1AA" }}>
              {alerts.length} active alert{alerts.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {criticalCount > 0 && (
            <span className="chip chip-red" style={{ fontWeight: 600 }}>
              {criticalCount} Critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="chip chip-amber" style={{ fontWeight: 600 }}>
              {warningCount} Warning
            </span>
          )}
          {infoCount > 0 && (
            <span className="chip chip-green" style={{ fontWeight: 600 }}>
              {infoCount} Info
            </span>
          )}
        </div>
      </div>

      {/* Alert rows */}
      <div>
        {alerts.map((alert, i) => {
          const cfg = SEVERITY_CONFIG[alert.severity];
          const AlertIcon = cfg.icon;

          return (
            <div
              key={alert.id}
              className="table-row-hover"
              style={{
                display: "flex",
                gap: 10,
                padding: "12px 18px",
                borderBottom: i < alerts.length - 1 ? "1px solid #F4F4F5" : "none",
                borderLeft: `3px solid ${cfg.accentBar}`,
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: cfg.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <AlertIcon style={{ width: 13, height: 13, color: cfg.iconColor }} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#18181B", lineHeight: 1.3 }}>
                    {alert.title}
                  </p>
                  <span
                    className={`chip ${cfg.chipClass}`}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      flexShrink: 0,
                    }}
                  >
                    {cfg.label}
                  </span>
                </div>

                <p style={{ fontSize: 12, marginTop: 3, color: "#71717A" }}>
                  {alert.reason}
                </p>

                <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: "#F4F4F5",
                      color: "#52525B",
                      border: "1px solid #E4E4E7",
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {alert.entity}
                  </span>
                  {alert.href && (
                    <Link
                      href={alert.href}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#3B82F6",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        textDecoration: "none",
                        flexShrink: 0,
                        marginLeft: 8,
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: "#EFF6FF",
                        border: "1px solid #BFDBFE",
                        transition: "background 0.15s ease",
                      }}
                    >
                      Take Action
                      <ArrowRight style={{ width: 11, height: 11 }} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
