import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.role;

  if (role === "FLEET_MANAGER") {
    const [
      totalVehicles, availableVehicles, onTripVehicles, inShopVehicles, retiredVehicles,
      activeTrips, draftTrips, availableDrivers, onTripDrivers,
    ] = await Promise.all([
      prisma.vehicle.count({ where: { status: { not: "RETIRED" } } }),
      prisma.vehicle.count({ where: { status: "AVAILABLE" } }),
      prisma.vehicle.count({ where: { status: "ON_TRIP" } }),
      prisma.vehicle.count({ where: { status: "IN_SHOP" } }),
      prisma.vehicle.count({ where: { status: "RETIRED" } }),
      prisma.trip.count({ where: { status: "DISPATCHED" } }),
      prisma.trip.count({ where: { status: "DRAFT" } }),
      prisma.driver.count({ where: { status: "AVAILABLE" } }),
      prisma.driver.count({ where: { status: "ON_TRIP" } }),
    ]);

    const fleetUtilization = totalVehicles > 0
      ? Math.round((onTripVehicles / totalVehicles) * 100)
      : 0;

    return NextResponse.json({
      totalVehicles,
      availableVehicles,
      onTripVehicles,
      inShopVehicles,
      retiredVehicles,
      activeTrips,
      draftTrips,
      availableDrivers,
      driversOnDuty: onTripDrivers,
      fleetUtilization,
    });
  }

  if (role === "DISPATCHER") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeTrips, draftTrips, availableVehicles, availableDrivers, completedToday] = await Promise.all([
      prisma.trip.count({ where: { status: "DISPATCHED" } }),
      prisma.trip.count({ where: { status: "DRAFT" } }),
      prisma.vehicle.count({ where: { status: "AVAILABLE" } }),
      prisma.driver.count({ where: { status: "AVAILABLE" } }),
      prisma.trip.count({ where: { status: "COMPLETED", completedAt: { gte: today } } }),
    ]);

    return NextResponse.json({ activeTrips, draftTrips, availableVehicles, availableDrivers, completedToday });
  }

  if (role === "SAFETY_OFFICER") {
    const today = new Date();
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [totalDrivers, validLicenses, expiringDrivers, expiredLicenses, suspendedDrivers, avgScore] = await Promise.all([
      prisma.driver.count(),
      prisma.driver.count({ where: { licenseExpiryDate: { gt: in30Days } } }),
      prisma.driver.count({ where: { licenseExpiryDate: { gt: today, lte: in30Days } } }),
      prisma.driver.count({ where: { licenseExpiryDate: { lte: today } } }),
      prisma.driver.count({ where: { status: "SUSPENDED" } }),
      prisma.driver.aggregate({ _avg: { safetyScore: true } }),
    ]);

    return NextResponse.json({
      totalDrivers,
      validLicenses,
      expiringWithin30Days: expiringDrivers,
      expiredLicenses,
      suspendedDrivers,
      averageSafetyScore: Math.round(avgScore._avg.safetyScore || 0),
    });
  }

  if (role === "FINANCIAL_ANALYST") {
    const [trips, fuelLogs, maintenanceLogs, expenses] = await Promise.all([
      prisma.trip.findMany({ where: { status: "COMPLETED" }, select: { revenue: true } }),
      prisma.fuelLog.findMany({ select: { cost: true } }),
      prisma.maintenanceLog.findMany({ where: { status: "COMPLETED" }, select: { cost: true } }),
      prisma.expense.findMany({ where: { type: { not: "Maintenance" } }, select: { amount: true } }),
    ]);

    const revenue = trips.reduce((sum, t) => sum + t.revenue, 0);
    const fuelCost = fuelLogs.reduce((sum, f) => sum + f.cost, 0);
    const maintenanceCost = maintenanceLogs.reduce((sum, m) => sum + m.cost, 0);
    const otherExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalCost = fuelCost + maintenanceCost + otherExpenses;
    const netContribution = revenue - totalCost;

    return NextResponse.json({ revenue, fuelCost, maintenanceCost, otherExpenses, totalCost, netContribution });
  }

  return NextResponse.json({ error: "Invalid role" }, { status: 400 });
}
