"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/AppHeader";
import { Settings, Building2, DollarSign, MapPin, Save, Shield } from "lucide-react";
import { toast } from "sonner";

const RBAC_MATRIX = [
  {
    resource: "Fleet & Vehicles",
    FLEET_MANAGER: { level: "Full Access", color: "#16a34a", desc: "CRUD, retire, status" },
    DISPATCHER: { level: "View + Dispatch", color: "#2563eb", desc: "View, assign to trips" },
    SAFETY_OFFICER: { level: "View Only", color: "#64748b", desc: "Read vehicle info" },
    FINANCIAL_ANALYST: { level: "View Only", color: "#64748b", desc: "Read for cost analysis" },
  },
  {
    resource: "Drivers",
    FLEET_MANAGER: { level: "Full Access", color: "#16a34a", desc: "CRUD, status changes" },
    DISPATCHER: { level: "View + Assign", color: "#2563eb", desc: "View, assign to trips" },
    SAFETY_OFFICER: { level: "Full Access", color: "#16a34a", desc: "Safety scores, suspend" },
    FINANCIAL_ANALYST: { level: "View Only", color: "#64748b", desc: "Driver roster view" },
  },
  {
    resource: "Trips",
    FLEET_MANAGER: { level: "View Only", color: "#64748b", desc: "Read trip data" },
    DISPATCHER: { level: "Full Access", color: "#16a34a", desc: "Create, dispatch, complete, cancel" },
    SAFETY_OFFICER: { level: "View Only", color: "#64748b", desc: "Trip compliance view" },
    FINANCIAL_ANALYST: { level: "View + Revenue", color: "#2563eb", desc: "Revenue, distance data" },
  },
  {
    resource: "Maintenance",
    FLEET_MANAGER: { level: "Full Access", color: "#16a34a", desc: "Schedule, start, complete, cancel" },
    DISPATCHER: { level: "View Only", color: "#64748b", desc: "Check maintenance status" },
    SAFETY_OFFICER: { level: "View Only", color: "#64748b", desc: "Safety-related maintenance" },
    FINANCIAL_ANALYST: { level: "View + Cost", color: "#2563eb", desc: "Cost tracking" },
  },
  {
    resource: "Fuel & Expenses",
    FLEET_MANAGER: { level: "View Only", color: "#64748b", desc: "Operational view" },
    DISPATCHER: { level: "Record Fuel", color: "#2563eb", desc: "Log fuel for active trips" },
    SAFETY_OFFICER: { level: "View Only", color: "#64748b", desc: "Read only" },
    FINANCIAL_ANALYST: { level: "Full Access", color: "#16a34a", desc: "CRUD, all expense types" },
  },
  {
    resource: "Analytics & Reports",
    FLEET_MANAGER: { level: "View Only", color: "#64748b", desc: "Fleet metrics" },
    DISPATCHER: { level: "View Only", color: "#64748b", desc: "Dispatch metrics" },
    SAFETY_OFFICER: { level: "View Only", color: "#64748b", desc: "Safety metrics" },
    FINANCIAL_ANALYST: { level: "Full Access", color: "#16a34a", desc: "All analytics, CSV export" },
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

const DEFAULTS = { company: "TransitOps Gujarat Logistics", currency: "INR (₹)", distanceUnit: "Kilometers" };

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

    // Fetch user session
    fetch("/api/auth/logout") // GET method retrieves session
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
    <div className="p-6">
      <PageHeader title="Settings" description="Company configuration and access control overview" breadcrumb="Settings" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Company Settings */}
        <div className="bg-white rounded-xl p-5" style={{ border: "1px solid #e2e8f0" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#eff6ff" }}>
              <Building2 className="w-4 h-4" style={{ color: "#2563eb" }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Company / Depot</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Company / Depot Name</label>
              <input value={settings.company} onChange={e => setSettings({ ...settings, company: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 flex items-center gap-1" style={{ color: "#374151" }}>
                <DollarSign className="w-3.5 h-3.5" /> Currency
              </label>
              <select value={settings.currency} onChange={e => setSettings({ ...settings, currency: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }}>
                <option>INR (₹)</option>
                <option>USD ($)</option>
                <option>EUR (€)</option>
                <option>GBP (£)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 flex items-center gap-1" style={{ color: "#374151" }}>
                <MapPin className="w-3.5 h-3.5" /> Distance Unit
              </label>
              <select value={settings.distanceUnit} onChange={e => setSettings({ ...settings, distanceUnit: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }}>
                <option>Kilometers</option>
                <option>Miles</option>
              </select>
            </div>
            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: saved ? "#16a34a" : "#2563eb" }}>
              <Save className="w-3.5 h-3.5" />
              {saved ? "Saved!" : "Save Settings"}
            </button>
            <p className="text-xs" style={{ color: "#94a3b8" }}>Settings are stored locally in this browser session.</p>
          </div>
        </div>

        {/* Platform Info */}
        <div className="bg-white rounded-xl p-5" style={{ border: "1px solid #e2e8f0" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#f0fdf4" }}>
              <Settings className="w-4 h-4" style={{ color: "#16a34a" }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Platform Info</p>
          </div>
          <div className="space-y-3 text-sm">
            {[
              { label: "Platform", value: "TransitOps" },
              { label: "Version", value: "1.0.0 — Hackathon Build" },
              { label: "Auth", value: "iron-session + bcrypt RBAC" },
              { label: "Database", value: "PostgreSQL via Prisma ORM" },
              { label: "Session Expiry", value: "24 hours" },
              { label: "Demo Password", value: "demo1234 (all accounts)" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid #f8fafc" }}>
                <span style={{ color: "#64748b" }}>{item.label}</span>
                <span className="font-medium" style={{ color: "#0f172a" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending User Role Assignment (only for Fleet Managers) */}
      {currentUser?.role === "FLEET_MANAGER" && (
        <div className="bg-white rounded-xl p-5 mb-6" style={{ border: "1px solid #e2e8f0" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-50">
              <Shield className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Pending User Assignments</p>
              <p className="text-xs text-slate-500 mt-0.5">Assign operational roles to newly registered users</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-left border-b border-slate-100">
                  <th className="px-4 py-2.5 font-semibold">Name</th>
                  <th className="px-4 py-2.5 font-semibold">Email</th>
                  <th className="px-4 py-2.5 font-semibold">Registration Date</th>
                  <th className="px-4 py-2.5 font-semibold w-64">Assign Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <select
                          value={assigningRoles[user.id] || ""}
                          onChange={e => setAssigningRoles({ ...assigningRoles, [user.id]: e.target.value })}
                          className="border border-slate-200 rounded px-2.5 py-1 outline-none text-xs focus:border-blue-500"
                        >
                          <option value="">Select Role...</option>
                          <option value="FLEET_MANAGER">Fleet Manager</option>
                          <option value="DISPATCHER">Dispatcher</option>
                          <option value="SAFETY_OFFICER">Safety Officer</option>
                          <option value="FINANCIAL_ANALYST">Financial Analyst</option>
                        </select>
                        <button
                          onClick={() => handleAssignRole(user.id, assigningRoles[user.id])}
                          disabled={!assigningRoles[user.id]}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Assign
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      No pending users awaiting role assignment
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RBAC Matrix */}
      <div className="bg-white rounded-xl" style={{ border: "1px solid #e2e8f0" }}>
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid #f1f5f9" }}>
          <Shield className="w-4 h-4" style={{ color: "#7c3aed" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Role-Based Access Control Matrix</p>
            <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>Read-only reference — all permissions are enforced server-side via session middleware</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide w-40" style={{ color: "#64748b" }}>Resource</th>
                {ROLES.map(role => (
                  <th key={role} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RBAC_MATRIX.map((row, i) => (
                <tr key={row.resource} style={{ borderBottom: i < RBAC_MATRIX.length - 1 ? "1px solid #f8fafc" : "none" }}>
                  <td className="px-5 py-3.5 text-sm font-medium" style={{ color: "#374151" }}>{row.resource}</td>
                  {ROLES.map(role => {
                    const cell = row[role];
                    return (
                      <td key={role} className="px-4 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: cell.color }}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: cell.color }} />
                            {cell.level}
                          </span>
                          <span className="text-xs" style={{ color: "#94a3b8" }}>{cell.desc}</span>
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
