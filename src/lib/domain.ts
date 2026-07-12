import { prisma } from "@/lib/prisma";
import { Driver, Vehicle } from "@prisma/client";

// ─── Vehicle Rules ────────────────────────────────────────────────────────────

export type VehicleEligibilityResult =
  | { eligible: true; vehicle: Vehicle }
  | { eligible: false; reason: string; vehicle?: Vehicle };

export async function checkVehicleEligibility(vehicleId: string, cargoWeight?: number): Promise<VehicleEligibilityResult> {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return { eligible: false, reason: "Vehicle not found" };

  if (vehicle.status === "RETIRED") {
    return { eligible: false, reason: `${vehicle.name} is retired and cannot be dispatched`, vehicle };
  }
  if (vehicle.status === "IN_SHOP") {
    return { eligible: false, reason: `${vehicle.name} is currently in maintenance (IN_SHOP)`, vehicle };
  }
  if (vehicle.status === "ON_TRIP") {
    return { eligible: false, reason: `${vehicle.name} is already on an active trip`, vehicle };
  }
  if (vehicle.status !== "AVAILABLE") {
    return { eligible: false, reason: `${vehicle.name} is not available (status: ${vehicle.status})`, vehicle };
  }

  if (cargoWeight !== undefined && cargoWeight > vehicle.maximumLoadCapacity) {
    const excess = (cargoWeight - vehicle.maximumLoadCapacity).toFixed(1);
    return {
      eligible: false,
      reason: `Cargo exceeds ${vehicle.name}'s maximum load capacity by ${excess}T (max: ${vehicle.maximumLoadCapacity}T, cargo: ${cargoWeight}T)`,
      vehicle,
    };
  }

  return { eligible: true, vehicle };
}

// ─── Driver Rules ─────────────────────────────────────────────────────────────

export type DriverEligibilityResult =
  | { eligible: true; driver: Driver; licenseState: "VALID" | "EXPIRING_SOON" }
  | { eligible: false; reason: string; driver?: Driver };

export function getLicenseState(expiryDate: Date): "VALID" | "EXPIRING_SOON" | "EXPIRED" {
  const now = new Date();
  const expiry = new Date(expiryDate);
  if (expiry <= now) return "EXPIRED";
  const daysLeft = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysLeft <= 30 ? "EXPIRING_SOON" : "VALID";
}

export async function checkDriverEligibility(driverId: string): Promise<DriverEligibilityResult> {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) return { eligible: false, reason: "Driver not found" };

  if (driver.status === "SUSPENDED") {
    return { eligible: false, reason: `${driver.name} is suspended and cannot be assigned to trips`, driver };
  }
  if (driver.status === "ON_TRIP") {
    return { eligible: false, reason: `${driver.name} is already on an active trip`, driver };
  }
  if (driver.status === "OFF_DUTY") {
    return { eligible: false, reason: `${driver.name} is off duty`, driver };
  }

  const licenseState = getLicenseState(driver.licenseExpiryDate);
  if (licenseState === "EXPIRED") {
    return {
      eligible: false,
      reason: `${driver.name}'s license (${driver.licenseNumber}) has expired and they cannot drive`,
      driver,
    };
  }

  return { eligible: true, driver, licenseState };
}

// ─── Pre-dispatch Validation ──────────────────────────────────────────────────

export interface DispatchCheck {
  vehicleAvailable: boolean;
  driverAvailable: boolean;
  licenseValid: boolean;
  capacityValid: boolean;
  canDispatch: boolean;
  errors: string[];
  warnings: string[];
}

export async function runDispatchChecks(
  vehicleId: string,
  driverId: string,
  cargoWeight: number
): Promise<DispatchCheck> {
  const [vehicleResult, driverResult] = await Promise.all([
    checkVehicleEligibility(vehicleId, cargoWeight),
    checkDriverEligibility(driverId),
  ]);

  const errors: string[] = [];
  const warnings: string[] = [];

  const vehicleAvailable = vehicleResult.eligible;
  if (!vehicleAvailable) errors.push(vehicleResult.reason);

  const driverAvailable = driverResult.eligible;
  const licenseValid = driverAvailable;
  if (!driverAvailable) errors.push(driverResult.reason);

  // Separate capacity check
  const capacityValid = vehicleResult.eligible
    ? true
    : !vehicleResult.reason.includes("capacity")
      ? true
      : false;

  // Expiring soon warning
  if (driverResult.eligible && driverResult.licenseState === "EXPIRING_SOON") {
    warnings.push(`${driverResult.driver.name}'s license is expiring soon — renewal recommended`);
  }

  return {
    vehicleAvailable,
    driverAvailable,
    licenseValid,
    capacityValid,
    canDispatch: errors.length === 0,
    errors,
    warnings,
  };
}

// ─── Trip Code Generation ─────────────────────────────────────────────────────

export async function generateTripCode(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.trip.count();
  return `TRP-${year}-${String(count + 1).padStart(4, "0")}`;
}

// ─── Activity Log Helper ──────────────────────────────────────────────────────

export async function logActivity(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  description: string
) {
  return prisma.activityLog.create({
    data: { userId, action, entityType, entityId, description },
  });
}
