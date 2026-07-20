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

  const revenue             = trips.reduce((sum, t) => sum + t.revenue, 0);
  const fuelCost            = fuelLogs.reduce((sum, f) => sum + f.cost, 0);
  const totalFuelLiters     = fuelLogs.reduce((sum, f) => sum + f.liters, 0);
  const maintenanceCost     = maintenanceLogs.reduce((sum, m) => sum + m.cost, 0);
  const maintenanceExpenses = expenses.filter(e => e.type === "Maintenance").reduce((sum, e) => sum + e.amount, 0);
  const otherExpenses       = expenses.filter(e => e.type !== "Maintenance").reduce((sum, e) => sum + e.amount, 0);
  const totalCost           = fuelCost + maintenanceCost + maintenanceExpenses + otherExpenses;
  const netContribution     = revenue - totalCost;
  const profitMargin        = revenue > 0 ? Math.round((netContribution / revenue) * 100) : 0;
  const isProfit            = netContribution >= 0;

  const expenseByType = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + e.amount;
    return acc;
  }, {});

  const recentTrips = trips.slice(-6).reverse();

  const breakdownItems = [
    { label: "Fuel",        amount: fuelCost,                              color: "#F97316", pct: totalCost > 0 ? Math.round((fuelCost / totalCost) * 100) : 0 },
    { label: "Maintenance", amount: maintenanceCost + maintenanceExpenses, color: "#F59E0B", pct: totalCost > 0 ? Math.round(((maintenanceCost + maintenanceExpenses) / totalCost) * 100) : 0 },
    ...Object.entries(expenseByType).filter(([k]) => k !== "Maintenance").map(([k, v]) => ({
      label: k, amount: v, color: "#8B5CF6", pct: totalCost > 0 ? Math.round((v / totalCost) * 100) : 0
    })),
  ].sort((a, b) => b.amount - a.amount);

  const quickNav = [
    { label: "Full Analytics", href: "/finance/analytics", icon: "📊", color: "#10B981" },
    { label: "Export Reports", href: "/finance/reports",   icon: "📥", color: "#06B6D4" },
    { label: "Fuel Logs",      href: "/finance/fuel",      icon: "⛽", color: "#F97316" },
    { label: "All Expenses",   href: "/finance/expenses",  icon: "🧾", color: "#8B5CF6" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA" }}>

      {/* ═══ HEADER ═══ */}
      <div className="hero-banner" style={{ paddingBottom: 40 }}>
        <div className="absolute pointer-events-none"
          style={{ top: -100, right: -60, width: 260, height: 260, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(6,182,212,0.1), transparent 70%)" }} />

        <div className="relative">
          <p style={{ fontSize: 11, color: "#71717A", marginBottom: 20, letterSpacing: "0.02em" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: "#FFFFFF", letterSpacing: "-0.025em", lineHeight: 1.2, marginBottom: 4 }}>
            Financial Overview
          </h1>
          <p style={{ fontSize: 14, color: "#71717A" }}>
            Revenue tracking, cost analysis and fleet financial performance
          </p>
        </div>

        {/* Hero KPIs */}
        <div className="relative stagger" style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {[
            { label: "Total Revenue",     value: formatCurrency(revenue),       sub: `${trips.length} completed trips`,   color: "#10B981" },
            { label: "Total Cost",        value: formatCurrency(totalCost),     sub: "Fuel + maintenance + expenses",      color: "#EF4444" },
            { label: "Net Contribution",  value: formatCurrency(netContribution), sub: `${profitMargin}% profit margin`,   color: isProfit ? "#10B981" : "#EF4444" },
          ].map((kpi, i) => (
            <div
              key={kpi.label}
              className="card-glass animate-fade-in-up"
              style={{ padding: "22px 24px", animationDelay: `${i * 50}ms` }}
            >
              <p style={{ fontSize: 11, fontWeight: 500, color: "#71717A", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                {kpi.label}
              </p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.035em", lineHeight: 1 }}>
                {kpi.value}
              </p>
              <p style={{ fontSize: 12, marginTop: 6, color: "#52525B" }}>{kpi.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div style={{ padding: "36px 44px", display: "flex", flexDirection: "column", gap: 28 }}>

        {/* Secondary KPIs */}
        <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {[
            { label: "Fuel Spend",     value: formatCurrency(fuelCost),                             sub: `${Math.round(totalFuelLiters).toLocaleString("en-IN")}L consumed`, accent: "#F97316" },
            { label: "Maintenance",    value: formatCurrency(maintenanceCost + maintenanceExpenses), sub: "Service & repairs",                                                 accent: "#F59E0B" },
            { label: "Other Expenses", value: formatCurrency(otherExpenses),                         sub: "Toll, labour, admin",                                               accent: "#8B5CF6" },
            { label: "Profit Margin",  value: `${profitMargin}%`,                                   sub: "Revenue vs costs",                                                  accent: profitMargin >= 0 ? "#10B981" : "#EF4444" },
          ].map((card, i) => (
            <div
              key={card.label}
              className="card animate-fade-in-up"
              style={{ padding: "20px 22px", borderLeft: `3px solid ${card.accent}`, animationDelay: `${i * 40}ms` }}
            >
              <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                {card.label}
              </p>
              <p style={{ fontSize: 22, fontWeight: 700, color: "#18181B", letterSpacing: "-0.03em", lineHeight: 1 }}>
                {card.value}
              </p>
              <p style={{ fontSize: 12, marginTop: 6, color: "#A1A1AA" }}>{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Main panels */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* Cost Breakdown */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 24px",
                borderBottom: "1px solid #E4E4E7",
              }}
            >
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#18181B", letterSpacing: "-0.01em" }}>Cost Breakdown</p>
                <p style={{ fontSize: 12, marginTop: 2, color: "#A1A1AA" }}>By expense category</p>
              </div>
              <span className="chip chip-slate">{formatCurrency(totalCost)} total</span>
            </div>
            <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {breakdownItems.map(item => (
                <div key={item.label}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#3F3F46" }}>{item.label}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#18181B" }}>{formatCurrency(item.amount)}</span>
                      <span style={{ fontSize: 11, color: "#A1A1AA", minWidth: 28, textAlign: "right" }}>{item.pct}%</span>
                    </div>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ background: item.color, width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
              {breakdownItems.length === 0 && (
                <p style={{ textAlign: "center", fontSize: 13, color: "#A1A1AA", padding: "24px 0" }}>No expense data yet</p>
              )}
            </div>
          </div>

          {/* Recent Revenue */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 24px",
                borderBottom: "1px solid #E4E4E7",
              }}
            >
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#18181B", letterSpacing: "-0.01em" }}>Recent Revenue</p>
                <p style={{ fontSize: 12, marginTop: 2, color: "#A1A1AA" }}>Latest completed trips</p>
              </div>
              <a href="/finance/analytics" className="btn btn-blue-soft btn-sm">View analytics →</a>
            </div>
            <div>
              {recentTrips.length === 0 ? (
                <p style={{ padding: "48px 18px", textAlign: "center", color: "#A1A1AA", fontSize: 13 }}>No completed trips yet</p>
              ) : (
                recentTrips.map(trip => (
                  <div
                    key={trip.tripCode}
                    className="table-row-hover"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "16px 24px",
                        borderBottom: "1px solid #F4F4F5",
                      }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          background: "#ECFDF5",
                          border: "1px solid #D1FAE5",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          flexShrink: 0,
                        }}
                      >
                        💰
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "#18181B" }}>{trip.source} → {trip.destination}</p>
                        <p style={{ fontSize: 11, marginTop: 1, fontFamily: "monospace", color: "#A1A1AA" }}>{trip.tripCode}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#059669", letterSpacing: "-0.02em" }}>
                      {formatCurrency(trip.revenue)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Navigation */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
            Quick Navigation
          </p>
          <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {quickNav.map((action, i) => (
              <a
                key={action.label}
                href={action.href}
                className="card animate-fade-in-up hover-action-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "18px 20px",
                  textDecoration: "none",
                  animationDelay: `${i * 40}ms`,
                  ["--hover-border" as any]: `${action.color}30`,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: `${action.color}10`,
                    border: `1px solid ${action.color}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {action.icon}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#18181B" }}>{action.label}</p>
                  <p style={{ fontSize: 11, color: "#A1A1AA", marginTop: 1 }}>Open →</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
