"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, ExternalLink, Truck } from "lucide-react";
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
  function openEdit(v: Vehicle) {
    setForm({
      registrationNumber: v.registrationNumber,
      name: v.name,
      model: v.model,
      type: v.type,
      maximumLoadCapacity: String(v.maximumLoadCapacity),
      acquisitionCost: String(v.acquisitionCost),
      region: v.region
    });
    setEditVehicle(v);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const url = editVehicle ? `/api/vehicles/${editVehicle.id}` : "/api/vehicles";
    const method = editVehicle ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) toast.error(data.error);
    else { toast.success(editVehicle ? "Vehicle updated successfully" : "Vehicle added successfully"); setShowForm(false); fetchVehicles(); }
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
        <p className="text-sm font-semibold" style={{ color: "#09090B" }}>{v as string}</p>
        <p className="text-xs font-mono" style={{ color: "#A1A1AA", marginTop: 1 }}>{row.registrationNumber as string}</p>
      </div>
    )},
    { key: "model", label: "Model" },
    { key: "type", label: "Type", sortable: true, render: (v) => <span className="chip chip-blue" style={{ fontWeight: 500 }}>{v as string}</span> },
    { key: "region", label: "Region", sortable: true },
    { key: "maximumLoadCapacity", label: "Capacity", render: (v) => `${v}T` },
    { key: "odometer", label: "Odometer", render: (v) => `${formatNumber(v as number)} km` },
    { key: "acquisitionCost", label: "Acq. Cost", render: (v) => formatCurrency(v as number) },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
    {
      key: "_actions", label: "Actions", className: "text-right",
      render: (_, row) => {
        const v = row as unknown as Vehicle;
        return (
          <div className="flex gap-2 justify-end">
            <button onClick={(e) => { e.stopPropagation(); router.push(`/fleet/vehicles/${v.id}`); }} className="btn btn-ghost btn-sm" title="View details"><ExternalLink className="w-3.5 h-3.5" /> Details</button>
            {v.status !== "RETIRED" && <button onClick={(e) => { e.stopPropagation(); openEdit(v); }} className="btn btn-blue-soft btn-sm">Edit</button>}
            {!["ON_TRIP", "RETIRED"].includes(v.status) && <button onClick={(e) => { e.stopPropagation(); setRetireId(v.id); }} className="btn btn-danger btn-sm">Retire</button>}
          </div>
        );
      }
    },
  ];

  return (
    <div style={{ padding: "36px 44px" }}>
      <PageHeader
        title="Vehicles"
        description="Manage fleet vehicles, registrations, specifications, and status"
        breadcrumb="Fleet Manager"
        actions={
          <button onClick={openCreate} className="btn btn-primary btn-lg">
            <Plus className="w-4 h-4" /> Add Vehicle
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={vehicles as unknown as Record<string, unknown>[]}
        loading={loading}
        searchPlaceholder="Search vehicles by name, registration, model, or region..."
        searchKeys={["name", "registrationNumber", "model", "region"]}
        filters={
          <div className="flex gap-3">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field" style={{ width: "auto", minWidth: 140 }}>
              {STATUSES.map(s => <option key={s} value={s}>{s || "All Statuses"}</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field" style={{ width: "auto", minWidth: 130 }}>
              <option value="">All Types</option>
              {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="input-field" style={{ width: "auto", minWidth: 140 }}>
              <option value="">All Regions</option>
              {REGIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        }
      />

      {/* Add / Edit Vehicle Modal — Standardized to Maintenance Modal Design */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-box modal-box-lg">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{editVehicle ? "Edit Vehicle Details" : "Add New Vehicle"}</h3>
                <p style={{ fontSize: 12, color: "#71717A", marginTop: 2 }}>
                  {editVehicle ? `Updating vehicle ${editVehicle.name} (${editVehicle.registrationNumber})` : "Register a new vehicle into the depot fleet roster"}
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Registration Number *
                    </label>
                    <input
                      required
                      type="text"
                      disabled={!!editVehicle}
                      placeholder="e.g. GJ01VN0005"
                      value={form.registrationNumber}
                      onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                      className="input-field disabled:opacity-60 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Vehicle Name / Code *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Van-05"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Model *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Tata Ace Gold"
                      value={form.model}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Vehicle Type *
                    </label>
                    <select
                      required
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="input-field"
                    >
                      {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Max Load Capacity (Tons) *
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0.1"
                      placeholder="0.5"
                      value={form.maximumLoadCapacity}
                      onChange={(e) => setForm({ ...form, maximumLoadCapacity: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Acquisition Cost (₹) *
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      placeholder="650000"
                      value={form.acquisitionCost}
                      onChange={(e) => setForm({ ...form, acquisitionCost: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                    Depot Region / Hub *
                  </label>
                  <select
                    required
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                    className="input-field"
                  >
                    {REGIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  <Truck className="w-4 h-4" />
                  {submitting ? "Saving Vehicle..." : editVehicle ? "Update Vehicle" : "Add Vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!retireId}
        title="Retire Vehicle"
        description="The vehicle will be marked as RETIRED and removed from dispatch roster. This action can be audited."
        confirmLabel="Retire Vehicle"
        variant="danger"
        onConfirm={() => handleRetire(retireId!)}
        onCancel={() => setRetireId(null)}
      />
    </div>
  );
}
