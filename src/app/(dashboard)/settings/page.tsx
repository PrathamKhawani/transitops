"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/AppHeader";
import { Settings, Building2, DollarSign, MapPin, Save, Shield } from "lucide-react";
import { toast } from "sonner";

const RBAC_MATRIX = [
  {
    resource: "Fleet & Vehicles",
    FLEET_MANAGER: { level: "Full Access", color: "#10B981", desc: "CRUD, retire, status" },
    DISPATCHER: { level: "View + Dispatch", color: "#3B82F6", desc: "View, assign to trips" },
    SAFETY_OFFICER: { level: "View Only", color: "#71717A", desc: "Read vehicle info" },
    FINANCIAL_ANALYST: { level: "View Only", color: "#71717A", desc: "Read for cost analysis" },
  },
  {
    resource: "Drivers",
    FLEET_MANAGER: { level: "Full Access", color: "#10B981", desc: "CRUD, status changes" },
    DISPATCHER: { level: "View + Assign", color: "#3B82F6", desc: "View, assign to trips" },
    SAFETY_OFFICER: { level: "Full Access", color: "#10B981", desc: "Safety scores, suspend" },
    FINANCIAL_ANALYST: { level: "View Only", color: "#71717A", desc: "Driver roster view" },
  },
  {
    resource: "Trips",
    FLEET_MANAGER: { level: "View Only", color: "#71717A", desc: "Read trip data" },
    DISPATCHER: { level: "Full Access", color: "#10B981", desc: "Create, dispatch, complete, cancel" },
    SAFETY_OFFICER: { level: "View Only", color: "#71717A", desc: "Trip compliance view" },
    FINANCIAL_ANALYST: { level: "View + Revenue", color: "#3B82F6", desc: "Revenue, distance data" },
  },
  {
    resource: "Maintenance",
    FLEET_MANAGER: { level: "Full Access", color: "#10B981", desc: "Schedule, start, complete, cancel" },
    DISPATCHER: { level: "View Only", color: "#71717A", desc: "Check maintenance status" },
    SAFETY_OFFICER: { level: "View Only", color: "#71717A", desc: "Safety-related maintenance" },
    FINANCIAL_ANALYST: { level: "View + Cost", color: "#3B82F6", desc: "Cost tracking" },
  },
  {
    resource: "Fuel & Expenses",
    FLEET_MANAGER: { level: "View Only", color: "#71717A", desc: "Operational view" },
    DISPATCHER: { level: "Record Fuel", color: "#3B82F6", desc: "Log fuel for active trips" },
    SAFETY_OFFICER: { level: "View Only", color: "#71717A", desc: "Read only" },
    FINANCIAL_ANALYST: { level: "Full Access", color: "#10B981", desc: "CRUD, all expense types" },
  },
  {
    resource: "Analytics & Reports",
    FLEET_MANAGER: { level: "View Only", color: "#71717A", desc: "Fleet metrics" },
    DISPATCHER: { level: "View Only", color: "#71717A", desc: "Dispatch metrics" },
    SAFETY_OFFICER: { level: "View Only", color: "#71717A", desc: "Safety metrics" },
    FINANCIAL_ANALYST: { level: "Full Access", color: "#10B981", desc: "All analytics, CSV export" },
  },
];

type Role = "FLEET_MANAGER" | "DISPATCHER" | "SAFETY_OFFICER" | "FINANCIAL_ANALYST";
const ROLE_LABELS: Record<Role, string> = {
  FLEET_MANAGER: "Fleet Manager",
  DISPATCHER: "Dispatcher",
  SAFETY_OFFICER: "Safety Officer",
  FINANCIAL_ANALYST: "Financial Analyst",
};
const ROLES: Role[] = ["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"];

const DEFAULTS = { company: "TransitOps Gujarat Depot", currency: "INR (₹)", distanceUnit: "Kilometers" };

export default function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [pendingUsers, setPendingUsers] = useState<Array<{ id: string; name: string; email: string; role: string; createdAt: string }>>([]);
  const [assigningRoles, setAssigningRoles] = useState<Record<string, string>>({});

  async function fetchPendingUsers() {
    try {
      const res = await fetch("/api/users/pending");
      if (res.ok) {
        const data = await res.json();
        setPendingUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem("transitops_settings");
      if (stored) setSettings(JSON.parse(stored));
    } catch { /* ignore */ }

    fetch("/api/auth/logout")
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setCurrentUser(data.user);
          if (data.user.role === "FLEET_MANAGER") {
            fetchPendingUsers();
          }
        }
      });
  }, []);

  async function handleAssignRole(userId: string, role: string) {
    if (!role) return;
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Role assigned successfully");
        fetchPendingUsers();
      } else {
        toast.error(data.error || "Failed to assign role");
      }
    } catch {
      toast.error("Network error");
    }
  }

  function handleSave() {
    try { localStorage.setItem("transitops_settings", JSON.stringify(settings)); } catch { /* ignore */ }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20, background: "#FAFAFA", minHeight: "100vh" }}>
      <PageHeader title="Settings" description="Company configuration and access control overview" breadcrumb="Settings" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Company Settings */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F4F4F5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 style={{ width: 15, height: 15, color: "#18181B" }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#18181B" }}>Company Settings</p>
              <p style={{ fontSize: 12, color: "#A1A1AA" }}>Define depot rules & formats</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Company / Depot Name</label>
              <input 
                value={settings.company} 
                onChange={e => setSettings({ ...settings, company: e.target.value })} 
                className="input-field"
              />
            </div>
            <div>
              <label style={labelStyle}>Currency Symbol</label>
              <select 
                value={settings.currency} 
                onChange={e => setSettings({ ...settings, currency: e.target.value })} 
                className="input-field"
              >
                <option>INR (₹)</option>
                <option>USD ($)</option>
                <option>EUR (€)</option>
                <option>GBP (£)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Distance Unit</label>
              <select 
                value={settings.distanceUnit} 
                onChange={e => setSettings({ ...settings, distanceUnit: e.target.value })} 
                className="input-field"
              >
                <option>Kilometers</option>
                <option>Miles</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <button 
                onClick={handleSave} 
                className="btn btn-primary"
                style={{ background: saved ? "#10B981" : "#18181B" }}
              >
                <Save style={{ width: 14, height: 14 }} />
                {saved ? "Saved!" : "Save Changes"}
              </button>
              <span style={{ fontSize: 11, color: "#A1A1AA" }}>Stored in browser storage</span>
            </div>
          </div>
        </div>

        {/* Platform Info */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F4F4F5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Settings style={{ width: 15, height: 15, color: "#18181B" }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#18181B" }}>System Information</p>
              <p style={{ fontSize: 12, color: "#A1A1AA" }}>Operational environment status</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              { label: "Platform Core", value: "TransitOps Enterprise v1.0" },
              { label: "Execution Environment", value: "Next.js 15 (Turbopack)" },
              { label: "Database Layer", value: "PostgreSQL v16 via Prisma Adapter" },
              { label: "Access Control Model", value: "Session-based Cryptographic RBAC" },
              { label: "Security Token Age", value: "86,400 seconds (24 Hours)" },
              { label: "Evaluation Bypass", value: "Active (demo accounts enabled)" },
            ].map((item, idx, arr) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: idx < arr.length - 1 ? "1px solid #F4F4F5" : "none" }}>
                <span style={{ fontSize: 13, fontWeight: 450, color: "#71717A" }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#18181B" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending User Role Assignment (only for Fleet Managers) */}
      {currentUser?.role === "FLEET_MANAGER" && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #E4E4E7" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "#FFFBEB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Shield style={{ width: 14, height: 14, color: "#F59E0B" }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#18181B" }}>Pending User Assignments</p>
                <p style={{ fontSize: 12, color: "#A1A1AA" }}>Approve new operational staff registrations</p>
              </div>
            </div>
            {pendingUsers.length > 0 && (
              <span className="chip chip-amber" style={{ fontWeight: 600 }}>
                {pendingUsers.length} waiting
              </span>
            )}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#FAFAFA", borderBottom: "1px solid #E4E4E7" }}>
                  {["Name", "Email Address", "Registration Date", "Assign Access Role"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#A1A1AA" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((user, i) => (
                  <tr key={user.id} className="table-row-hover" style={{ borderBottom: i < pendingUsers.length - 1 ? "1px solid #F4F4F5" : "none" }}>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: "#18181B" }}>{user.name}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#52525B" }}>{user.email}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#71717A" }}>
                      {new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <select
                          value={assigningRoles[user.id] || ""}
                          onChange={e => setAssigningRoles({ ...assigningRoles, [user.id]: e.target.value })}
                          className="input-field"
                          style={{ width: 180, padding: "4px 8px", fontSize: 12 }}
                        >
                          <option value="">Select access level...</option>
                          <option value="FLEET_MANAGER">Fleet Manager</option>
                          <option value="DISPATCHER">Dispatcher</option>
                          <option value="SAFETY_OFFICER">Safety Officer</option>
                          <option value="FINANCIAL_ANALYST">Financial Analyst</option>
                        </select>
                        <button
                          onClick={() => handleAssignRole(user.id, assigningRoles[user.id])}
                          disabled={!assigningRoles[user.id]}
                          className="btn btn-primary btn-sm"
                        >
                          Assign Access
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: "40px 16px", textAlign: "center" }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "#059669" }}>All Clear</p>
                      <p style={{ fontSize: 12, marginTop: 4, color: "#A1A1AA" }}>No pending staff registrations requiring approval.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RBAC Matrix */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid #E4E4E7" }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield style={{ width: 14, height: 14, color: "#8B5CF6" }} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#18181B" }}>Access Control Matrix (RBAC)</p>
            <p style={{ fontSize: 12, color: "#A1A1AA" }}>Permissions strictly enforced server-side via session cookies</p>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAFAFA", borderBottom: "1px solid #E4E4E7" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#A1A1AA" }}>
                  Resource Area
                </th>
                {ROLES.map(role => (
                  <th key={role} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#A1A1AA" }}>
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RBAC_MATRIX.map((row, i) => (
                <tr key={row.resource} className="table-row-hover" style={{ borderBottom: i < RBAC_MATRIX.length - 1 ? "1px solid #F4F4F5" : "none" }}>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#18181B" }}>{row.resource}</td>
                  {ROLES.map(role => {
                    const cell = row[role];
                    return (
                      <td key={role} style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: cell.color }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: cell.color }} />
                            {cell.level}
                          </span>
                          <span style={{ fontSize: 11, color: "#71717A", marginTop: 2 }}>{cell.desc}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  color: "#71717A",
  marginBottom: 5,
};
