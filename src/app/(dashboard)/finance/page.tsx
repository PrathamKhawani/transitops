import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/AppHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DollarSign, Fuel, Wrench, Receipt, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default async function FinanceDashboard() {
  const session = await requireAuth();
  if (!session || session.role !== "FINANCIAL_ANALYST") redirect("/login");

  const [trips, fuelLogs, maintenanceLogs, expenses] = await Promise.all([
    prisma.trip.findMany({ where: { status: "COMPLETED" }, select: { revenue: true, source: true, destination: true, tripCode: true, completedAt: true } }),
    prisma.fuelLog.findMany({ select: { cost: true, liters: true } }),
    prisma.maintenanceLog.findMany({ where: { status: "COMPLETED" }, select: { cost: true, type: true } }),
    prisma.expense.findMany({ select: { amount: true, type: true } }),
  ]);

  const revenue = trips.reduce((sum, t) => sum + t.revenue, 0);
  const fuelCost = fuelLogs.reduce((sum, f) => sum + f.cost, 0);
  const totalFuelLiters = fuelLogs.reduce((sum, f) => sum + f.liters, 0);
  const maintenanceCost = maintenanceLogs.reduce((sum, m) => sum + m.cost, 0);
  const maintenanceExpenses = expenses.filter(e => e.type === "Maintenance").reduce((sum, e) => sum + e.amount, 0);
  const otherExpenses = expenses.filter(e => e.type !== "Maintenance").reduce((sum, e) => sum + e.amount, 0);
  const totalCost = fuelCost + maintenanceCost + maintenanceExpenses + otherExpenses;
  const netContribution = revenue - totalCost;

  // Expense breakdown by type
  const expenseByType = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + e.amount;
    return acc;
  }, {});

  const recentTrips = trips.slice(-5).reverse();

  return (
    <div className="p-6">
      <PageHeader title="Finance Dashboard" description="Revenue, costs, and operational financial analytics" breadcrumb="Financial Analyst" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KpiCard title="Total Revenue" value={formatCurrency(revenue)} subtitle={`${trips.length} completed trips`} icon={DollarSign} iconColor="#16a34a" iconBg="#f0fdf4" accent="#22c55e" />
        <KpiCard title="Fuel Cost" value={formatCurrency(fuelCost)} subtitle={`${Math.round(totalFuelLiters).toLocaleString("en-IN")}L consumed`} icon={Fuel} iconColor="#ea580c" iconBg="#fff7ed" accent="#f97316" />
        <KpiCard title="Maintenance Cost" value={formatCurrency(maintenanceCost + maintenanceExpenses)} subtitle="Service & repairs" icon={Wrench} iconColor="#b45309" iconBg="#fffbeb" accent="#f59e0b" />
        <KpiCard title="Other Expenses" value={formatCurrency(otherExpenses)} subtitle="Toll, labour, admin" icon={Receipt} iconColor="#7c3aed" iconBg="#faf5ff" accent="#8b5cf6" />
        <KpiCard title="Total Cost" value={formatCurrency(totalCost)} subtitle="All expenditures" icon={TrendingDown} iconColor="#dc2626" iconBg="#fef2f2" accent="#ef4444" />
        <KpiCard
          title="Net Contribution"
          value={formatCurrency(netContribution)}
          subtitle={netContribution >= 0 ? "Revenue surplus" : "Operating loss"}
          icon={netContribution >= 0 ? TrendingUp : TrendingDown}
          iconColor={netContribution >= 0 ? "#16a34a" : "#dc2626"}
          iconBg={netContribution >= 0 ? "#f0fdf4" : "#fef2f2"}
          accent={netContribution >= 0 ? "#22c55e" : "#ef4444"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expense Breakdown */}
        <div className="bg-white rounded-xl" style={{ border: "1px solid #e2e8f0" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
            <h3 className="text-sm font-semibold" style={{ color: "#0f172a" }}>Expense Breakdown</h3>
          </div>
          <div className="p-5 space-y-3">
            {[
              { label: "Fuel", amount: fuelCost, color: "#f97316" },
              { label: "Maintenance", amount: maintenanceCost + maintenanceExpenses, color: "#f59e0b" },
              ...Object.entries(expenseByType).filter(([k]) => k !== "Maintenance").map(([k, v]) => ({ label: k, amount: v, color: "#8b5cf6" })),
            ].sort((a, b) => b.amount - a.amount).map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: "#374151" }}>{item.label}</span>
                  <span className="font-medium" style={{ color: "#0f172a" }}>{formatCurrency(item.amount)}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "#f1f5f9" }}>
                  <div className="h-1.5 rounded-full" style={{ background: item.color, width: `${totalCost > 0 ? Math.round((item.amount / totalCost) * 100) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Completed Trips */}
        <div className="bg-white rounded-xl" style={{ border: "1px solid #e2e8f0" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
            <h3 className="text-sm font-semibold" style={{ color: "#0f172a" }}>Recent Completed Trips Revenue</h3>
          </div>
          <div className="divide-y" style={{ borderColor: "#f8fafc" }}>
            {recentTrips.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm" style={{ color: "#94a3b8" }}>No completed trips</p>
            ) : (
              recentTrips.map((trip) => (
                <div key={trip.tripCode} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{trip.source} → {trip.destination}</p>
                    <p className="text-xs" style={{ color: "#94a3b8" }}>{trip.tripCode}</p>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "#16a34a" }}>{formatCurrency(trip.revenue)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
