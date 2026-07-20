"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/AppHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface Vehicle {
  id: string; registrationNumber: string; name: string; model: string; type: string;
  maximumLoadCapacity: number; odometer: number; acquisitionCost: number; region: string; status: string;
}

const VEHICLE_TYPES = ["Heavy Truck", "Medium Truck", "Mini Truck", "Van", "Bus", "Tanker"];
const REGIONS = ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Bhavnagar", "Jamnagar"];
const STATUSES = ["", "AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"];

const emptyForm = { registrationNumber: "", name: "", model: "", type: "Heavy Truck", maximumLoadCapacity: "", acquisitionCost: "", region: "Ahmedabad" };

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [retireId, setRetireId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    if (regionFilter) params.set("region", regionFilter);
    const res = await fetch(`/api/vehicles?${params}`);
    setVehicles(await res.json());
    setLoading(false);
  }, [statusFilter, typeFilter, regionFilter]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  function openCreate() { setForm({ ...emptyForm }); setEditVehicle(null); setShowForm(true); }
  function openEdit(v: Vehicle) { setForm({ registrationNumber: v.registrationNumber, name: v.name, model: v.model, type: v.type, maximumLoadCapacity: String(v.maximumLoadCapacity), acquisitionCost: String(v.acquisitionCost), region: v.region }); setEditVehicle(v); setShowForm(true); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const url = editVehicle ? `/api/vehicles/${editVehicle.id}` : "/api/vehicles";
    const method = editVehicle ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) toast.error(data.error);
    else { toast.success(editVehicle ? "Vehicle updated" : "Vehicle added"); setShowForm(false); fetchVehicles(); }
    setSubmitting(false);
  }

  async function handleRetire(id: string) {
    const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) toast.error(data.error);
    else { toast.success("Vehicle retired"); fetchVehicles(); }
    setRetireId(null);
  }

  const columns: Column<Record<string, unknown>>[] = [
    { key: "name", label: "Vehicle", sortable: true, render: (v, row) => (
      <div>
        <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{v as string}</p>
        <p className="text-xs" style={{ color: "#94a3b8" }}>{row.registrationNumber as string}</p>
      </div>
    )},
    { key: "model", label: "Model" },
    { key: "type", label: "Type", sortable: true },
    { key: "region", label: "Region", sortable: true },
    { key: "maximumLoadCapacity", label: "Capacity", render: (v) => `${v}T` },
    { key: "odometer", label: "Odometer", render: (v) => `${formatNumber(v as number)} km` },
    { key: "acquisitionCost", label: "Acq. Cost", render: (v) => formatCurrency(v as number) },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
    {
      key: "_actions", label: "", className: "w-20",
      render: (_, row) => {
        const v = row as unknown as Vehicle;
        return (
          <div className="flex gap-1 justify-end">
            <button onClick={(e) => { e.stopPropagation(); router.push(`/fleet/vehicles/${v.id}`); }} className="p-1.5 rounded hover:bg-slate-50" title="Details"><ExternalLink className="w-3.5 h-3.5 text-slate-400" /></button>
            {v.status !== "RETIRED" && <button onClick={(e) => { e.stopPropagation(); openEdit(v); }} className="p-1.5 rounded hover:bg-blue-50 text-xs font-medium" style={{ color: "#2563eb" }}>Edit</button>}
            {!["ON_TRIP", "RETIRED"].includes(v.status) && <button onClick={(e) => { e.stopPropagation(); setRetireId(v.id); }} className="p-1.5 rounded hover:bg-red-50 text-xs font-medium" style={{ color: "#dc2626" }}>Retire</button>}
          </div>
        );
      }
    },
  ];

  return (
    <div style={{ padding: "36px 44px" }}>
      <PageHeader
        title="Vehicles"
        description="Manage fleet vehicles, assignments and status"
        breadcrumb="Fleet Manager"
        actions={
          <button onClick={openCreate} className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#2563eb" }}>
            <Plus className="w-4 h-4" /> Add Vehicle
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={vehicles as unknown as Record<string, unknown>[]}
        loading={loading}
        searchPlaceholder="Search vehicles..."
        searchKeys={["name", "registrationNumber", "model", "region"]}
        filters={
          <div className="flex gap-3">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field" style={{ width: "auto", minWidth: 130 }}>
              {STATUSES.map(s => <option key={s} value={s}>{s || "All Status"}</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field" style={{ width: "auto", minWidth: 120 }}>
              <option value="">All Types</option>
              {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="input-field" style={{ width: "auto", minWidth: 130 }}>
              <option value="">All Regions</option>
              {REGIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        }
      />

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" style={{ border: "1px solid #e2e8f0" }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <h3 className="text-sm font-semibold" style={{ color: "#0f172a" }}>{editVehicle ? "Edit Vehicle" : "Add Vehicle"}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Registration Number *", key: "registrationNumber", placeholder: "GJ01VN0005", disabled: !!editVehicle },
                  { label: "Vehicle Name *", key: "name", placeholder: "Van-05" },
                  { label: "Model *", key: "model", placeholder: "Tata Ace Gold" },
                  { label: "Max Load Capacity (T) *", key: "maximumLoadCapacity", type: "number", placeholder: "0.5" },
                  { label: "Acquisition Cost (₹) *", key: "acquisitionCost", type: "number", placeholder: "650000" },
                ].map(({ label, key, type, placeholder, disabled }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>{label}</label>
                    <input required type={type || "text"} step="any" disabled={disabled} placeholder={placeholder} value={(form as Record<string, string>)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50" style={{ borderColor: "#e2e8f0" }} />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Type *</label>
                  <select required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }}>
                    {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Region *</label>
                  <select required value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#e2e8f0" }}>
                    {REGIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-5">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#e2e8f0", color: "#374151" }}>Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: "#2563eb" }}>{submitting ? "Saving..." : editVehicle ? "Update" : "Add Vehicle"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!retireId}
        title="Retire Vehicle"
        description="The vehicle will be marked as RETIRED and removed from dispatch. This cannot be undone."
        confirmLabel="Retire"
        variant="danger"
        onConfirm={() => handleRetire(retireId!)}
        onCancel={() => setRetireId(null)}
      />
    </div>
  );
}
