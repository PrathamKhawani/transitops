import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getLicenseState } from "@/lib/domain";

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "DISPATCHER") {
    return NextResponse.json({ error: "Only dispatchers can use Smart Dispatch" }, { status: 403 });
  }

  const body = await request.json();
  const cargoWeight = Number(body.cargoWeight);
  const plannedDistance = Number(body.plannedDistance);

  if (!cargoWeight || cargoWeight <= 0)
    return NextResponse.json({ error: "Valid cargoWeight required" }, { status: 400 });
  if (!plannedDistance || plannedDistance <= 0)
    return NextResponse.json({ error: "Valid plannedDistance required" }, { status: 400 });

  // Fetch all AVAILABLE vehicles with 90-day maintenance + completed trip history
  const vehicles = await prisma.vehicle.findMany({
    where: { status: "AVAILABLE" },
    include: {
      trips: {
        where: { status: "COMPLETED", fuelConsumed: { not: null }, actualDistance: { not: null } },
        select: { actualDistance: true, fuelConsumed: true },
      },
      maintenanceLogs: {
        where: { startDate: { gte: new Date(Date.now() - 90 * 24 * 3600000) } },
        select: { cost: true, status: true },
      },
    },
  });

  // Fleet-wide avg fuel efficiency (km/L) for normalization
  const allHistory = vehicles.flatMap(v => v.trips).filter(t => (t.fuelConsumed ?? 0) > 0);
  const fleetTotalDist = allHistory.reduce((s, t) => s + (t.actualDistance ?? 0), 0);
  const fleetTotalFuel = allHistory.reduce((s, t) => s + (t.fuelConsumed ?? 0), 0);
  const fleetAvgEff = fleetTotalFuel > 0 ? fleetTotalDist / fleetTotalFuel : 5.0;

  type RejectedVehicle = { name: string; registrationNumber: string; type: string; maximumLoadCapacity: number; reason: string };
  type ScoredVehicle = {
    id: string; name: string; registrationNumber: string; type: string; region: string;
    maximumLoadCapacity: number; odometer: number;
    capacityUtilization: number; capacityFit: number;
    fuelEfficiency: number | null; fuelScore: number;
    maintenanceScore: number; availabilityScore: number; vehicleScore: number;
  };

  const rejectedVehicles: RejectedVehicle[] = [];
  const scoredVehicles: ScoredVehicle[] = [];

  for (const v of vehicles) {
    if (v.maximumLoadCapacity < cargoWeight) {
      rejectedVehicles.push({
        name: v.name, registrationNumber: v.registrationNumber,
        type: v.type, maximumLoadCapacity: v.maximumLoadCapacity,
        reason: `Capacity ${v.maximumLoadCapacity}T < cargo ${cargoWeight}T`,
      });
      continue;
    }

    // 1. Capacity Fit (35%) — how well does cargo fill vehicle?
    const capacityFit = Math.min((cargoWeight / v.maximumLoadCapacity) * 100, 100);

    // 2. Historical Fuel Efficiency (30%) — vs fleet avg
    const vDist = v.trips.reduce((s, t) => s + (t.actualDistance ?? 0), 0);
    const vFuel = v.trips.reduce((s, t) => s + (t.fuelConsumed ?? 0), 0);
    const vehicleEff = vFuel > 0 ? vDist / vFuel : fleetAvgEff;
    const fuelScore = Math.min(Math.round((vehicleEff / fleetAvgEff) * 80), 100);

    // 3. Maintenance Reliability (20%) — deduct for recent maintenance activity
    const activeMaintenance = v.maintenanceLogs.filter(m => m.status === "IN_PROGRESS").length;
    const recentCompletedCost = v.maintenanceLogs
      .filter(m => m.status === "COMPLETED")
      .reduce((s, m) => s + m.cost, 0);
    const maintenanceScore = Math.max(0, Math.round(
      100 - activeMaintenance * 30 - Math.min((recentCompletedCost / 100000) * 40, 40)
    ));

    // 4. Availability (15%) — always 100 for AVAILABLE vehicles
    const availabilityScore = 100;

    const vehicleScore = Math.round(
      capacityFit * 0.35 + fuelScore * 0.30 + maintenanceScore * 0.20 + availabilityScore * 0.15
    );

    scoredVehicles.push({
      id: v.id, name: v.name, registrationNumber: v.registrationNumber,
      type: v.type, region: v.region, maximumLoadCapacity: v.maximumLoadCapacity, odometer: v.odometer,
      capacityUtilization: Math.round((cargoWeight / v.maximumLoadCapacity) * 100),
      capacityFit: Math.round(capacityFit),
      fuelEfficiency: vFuel > 0 ? Math.round(vehicleEff * 10) / 10 : null,
      fuelScore, maintenanceScore, availabilityScore, vehicleScore,
    });
  }

  scoredVehicles.sort((a, b) => b.vehicleScore - a.vehicleScore);

  // Score AVAILABLE drivers
  const today = new Date();
  const allDrivers = await prisma.driver.findMany({ where: { status: "AVAILABLE" } });

  type RejectedDriver = { name: string; licenseNumber: string; reason: string };
  type ScoredDriver = {
    id: string; name: string; licenseNumber: string; licenseCategory: string;
    safetyScore: number; licenseState: string; daysUntilExpiry: number;
    licenseScore: number; driverScore: number;
  };

  const rejectedDrivers: RejectedDriver[] = [];
  const scoredDrivers: ScoredDriver[] = [];

  for (const d of allDrivers) {
    const licenseState = getLicenseState(d.licenseExpiryDate);
    if (licenseState === "EXPIRED") {
      rejectedDrivers.push({
        name: d.name, licenseNumber: d.licenseNumber,
        reason: `License expired ${d.licenseExpiryDate.toISOString().split("T")[0]}`,
      });
      continue;
    }

    const daysUntilExpiry = Math.max(0, Math.floor(
      (d.licenseExpiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    ));

    // Driver score: Safety 50% + License Validity 30% + Availability 20%
    const licenseScore = licenseState === "VALID" ? 100 : 60;
    const driverScore = Math.round(d.safetyScore * 0.50 + licenseScore * 0.30 + 100 * 0.20);

    scoredDrivers.push({
      id: d.id, name: d.name, licenseNumber: d.licenseNumber, licenseCategory: d.licenseCategory,
      safetyScore: d.safetyScore, licenseState, daysUntilExpiry, licenseScore, driverScore,
    });
  }

  scoredDrivers.sort((a, b) => b.driverScore - a.driverScore);

  const bestVehicle = scoredVehicles[0] ?? null;
  const bestDriver = scoredDrivers[0] ?? null;
  const confidence = bestVehicle && bestDriver
    ? Math.round((bestVehicle.vehicleScore + bestDriver.driverScore) / 2)
    : 0;

  return NextResponse.json({
    vehicles: scoredVehicles.slice(0, 5),
    drivers: scoredDrivers.slice(0, 5),
    rejectedVehicles,
    rejectedDrivers,
    recommended: { vehicle: bestVehicle, driver: bestDriver, confidence },
    inputs: { cargoWeight, plannedDistance },
    fleetAvgEfficiency: Math.round(fleetAvgEff * 10) / 10,
  });
}
