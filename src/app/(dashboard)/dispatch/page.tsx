import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/AppHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { MapPin, FileText, Car, Users, CheckCircle } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/utils";

export default async function DispatchDashboard() {
  const session = await requireAuth();
  if (!session || session.role !== "DISPATCHER") redirect("/login");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [activeTrips, draftTrips, availableVehicles, availableDrivers, completedToday, recentTrips] = await Promise.all([
    prisma.trip.count({ where: { status: "DISPATCHED" } }),
    prisma.trip.count({ where: { status: "DRAFT" } }),
    prisma.vehicle.count({ where: { status: "AVAILABLE" } }),
    prisma.driver.count({ where: { status: "AVAILABLE" } }),
    prisma.trip.count({ where: { status: "COMPLETED", completedAt: { gte: today } } }),
    prisma.trip.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: {
        vehicle: { select: { name: true, registrationNumber: true } },
        driver: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="p-6">
      <PageHeader title="Dispatch Dashboard" description="Manage and monitor trip operations" breadcrumb="Dispatcher" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KpiCard title="Active Trips" value={activeTrips} icon={MapPin} iconColor="#2563eb" iconBg="#eff6ff" accent="#2563eb" />
        <KpiCard title="Draft Trips" value={draftTrips} icon={FileText} iconColor="#b45309" iconBg="#fffbeb" accent="#f59e0b" />
        <KpiCard title="Available Vehicles" value={availableVehicles} icon={Car} iconColor="#16a34a" iconBg="#f0fdf4" accent="#22c55e" />
        <KpiCard title="Available Drivers" value={availableDrivers} icon={Users} iconColor="#7c3aed" iconBg="#faf5ff" accent="#8b5cf6" />
        <KpiCard title="Completed Today" value={completedToday} icon={CheckCircle} iconColor="#0891b2" iconBg="#ecfeff" accent="#06b6d4" />
      </div>

      <div className="bg-white rounded-xl" style={{ border: "1px solid #e2e8f0" }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #f1f5f9" }}>
          <h3 className="text-sm font-semibold" style={{ color: "#0f172a" }}>All Trips</h3>
          <a href="/dispatch/trips" className="text-xs font-medium" style={{ color: "#2563eb" }}>View all →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                {["Trip Code", "Route", "Vehicle", "Driver", "Status", "Date"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b", background: "#fafafa" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentTrips.map((trip, i) => (
                <tr key={trip.id} style={{ borderBottom: i < recentTrips.length - 1 ? "1px solid #f8fafc" : "none" }}>
                  <td className="px-4 py-3 text-sm font-mono text-xs" style={{ color: "#475569" }}>{trip.tripCode}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "#0f172a" }}>{trip.source} → {trip.destination}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "#374151" }}>{trip.vehicle.name}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "#374151" }}>{trip.driver.name}</td>
                  <td className="px-4 py-3"><StatusBadge status={trip.status} /></td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#94a3b8" }}>{formatDate(trip.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
