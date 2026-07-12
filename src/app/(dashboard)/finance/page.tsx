import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
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
  const profitMargin = revenue > 0 ? Math.round((netContribution / revenue) * 100) : 0;

  // Expense breakdown by type
  const expenseByType = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + e.amount;
    return acc;
  }, {});

  const recentTrips = trips.slice(-6).reverse();

  const breakdownItems = [
    { label: "Fuel", amount: fuelCost, color: "#f97316", pct: totalCost > 0 ? Math.round((fuelCost / totalCost) * 100) : 0 },
    { label: "Maintenance", amount: maintenanceCost + maintenanceExpenses, color: "#f59e0b", pct: totalCost > 0 ? Math.round(((maintenanceCost + maintenanceExpenses) / totalCost) * 100) : 0 },
    ...Object.entries(expenseByType).filter(([k]) => k !== "Maintenance").map(([k, v]) => ({
      label: k, amount: v, color: "#8b5cf6", pct: totalCost > 0 ? Math.round((v / totalCost) * 100) : 0
    })),
  ].sort((a, b) => b.amount - a.amount);

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      {/* Hero Header */}
      <div
        className="relative overflow-hidden px-6 pt-8 pb-10"
        style={{ background: "linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)" }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle, #34d399, transparent)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full opacity-8 pointer-events-none" style={{ background: "radial-gradient(circle, #6ee7b7, transparent)", transform: "translateY(50%)" }} />

        <div className="relative">
          <span className="text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full mb-3 inline-block" style={{ background: "rgba(52,211,153,0.2)", color: "#6ee7b7" }}>Financial Analyst</span>
          <h1 className="text-3xl font-bold text-white mb-1">Financial Command</h1>
          <p className="text-sm" style={{ color: "#a7f3d0" }}>Revenue, cost analysis and fleet financial performance</p>
        </div>

        {/* KPI Hero Bar */}
        <div className="relative mt-8 grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Total Revenue", value: formatCurrency(revenue), sub: `${trips.length} completed trips`, color: "#34d399" },
            { label: "Total Cost", value: formatCurrency(totalCost), sub: "Fuel + maintenance + expenses", color: "#fca5a5" },
            { label: "Net Contribution", value: formatCurrency(netContribution), sub: `${profitMargin}% profit margin`, color: netContribution >= 0 ? "#6ee7b7" : "#fca5a5" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#a7f3d0" }}>{kpi.label}</span>
                <div className="w-2 h-2 rounded-full" style={{ background: kpi.color }} />
              </div>
              <p className="text-2xl font-extrabold text-white">{kpi.value}</p>
              <p className="text-xs mt-1" style={{ color: "#6ee7b7" }}>{kpi.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-6 space-y-5">
        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Fuel Spend", value: formatCurrency(fuelCost), sub: `${Math.round(totalFuelLiters).toLocaleString("en-IN")}L consumed`, accent: "#f97316" },
            { label: "Maintenance", value: formatCurrency(maintenanceCost + maintenanceExpenses), sub: "Service & repairs", accent: "#f59e0b" },
            { label: "Other Expenses", value: formatCurrency(otherExpenses), sub: "Toll, labour, admin", accent: "#8b5cf6" },
            { label: "Profit Margin", value: `${profitMargin}%`, sub: "Revenue vs costs", accent: profitMargin >= 0 ? "#16a34a" : "#dc2626" },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-2xl p-5" style={{ border: "1px solid #e2e8f0", borderLeft: `4px solid ${card.accent}` }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{card.label}</p>
              <p className="text-xl font-extrabold text-slate-900">{card.value}</p>
              <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Expense Breakdown */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Cost Breakdown</h3>
                <p className="text-xs text-slate-400 mt-0.5">By expense category</p>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{formatCurrency(totalCost)} total</span>
            </div>
            <div className="p-6 space-y-5">
              {breakdownItems.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ background: item.color }} />
                      <span className="text-sm font-medium text-slate-700">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{formatCurrency(item.amount)}</span>
                      <span className="text-xs text-slate-400 w-8 text-right">{item.pct}%</span>
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-2.5 rounded-full transition-all duration-700" style={{ background: item.color, width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
              {breakdownItems.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">No expense data yet</p>
              )}
            </div>
          </div>

          {/* Recent Trips Revenue */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Revenue</h3>
                <p className="text-xs text-slate-400 mt-0.5">Latest completed trips</p>
              </div>
              <a href="/finance/analytics" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">View analytics →</a>
            </div>
            <div className="divide-y divide-slate-50">
              {recentTrips.length === 0 ? (
                <p className="px-6 py-12 text-center text-sm text-slate-400">No completed trips yet</p>
              ) : (
                recentTrips.map((trip) => (
                  <div key={trip.tripCode} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-sm">💰</div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{trip.source} → {trip.destination}</p>
                        <p className="text-xs text-slate-400">{trip.tripCode}</p>
                      </div>
                    </div>
                    <span className="text-base font-extrabold text-emerald-600">{formatCurrency(trip.revenue)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Full Analytics", href: "/finance/analytics", icon: "📊", color: "#16a34a", bg: "#f0fdf4" },
            { label: "Export Reports", href: "/finance/reports", icon: "📥", color: "#0891b2", bg: "#ecfeff" },
            { label: "Fuel Logs", href: "/finance/fuel", icon: "⛽", color: "#ea580c", bg: "#fff7ed" },
            { label: "All Expenses", href: "/finance/expenses", icon: "🧾", color: "#7c3aed", bg: "#faf5ff" },
          ].map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="flex items-center gap-3 bg-white rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ border: "1px solid #e2e8f0" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: action.bg }}>
                {action.icon}
              </div>
              <span className="text-sm font-semibold text-slate-800">{action.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
