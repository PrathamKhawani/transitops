import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"],
});

export const vehicleSchema = z.object({
  registrationNumber: z.string().min(1, "Registration number is required"),
  name: z.string().min(1, "Name is required"),
  model: z.string().min(1, "Model is required"),
  type: z.string().min(1, "Type is required"),
  maximumLoadCapacity: z.coerce.number().positive("Capacity must be positive"),
  acquisitionCost: z.coerce.number().positive("Cost must be positive"),
  region: z.string().min(1, "Region is required"),
  status: z.enum(["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"]).optional(),
});

export const driverSchema = z.object({
  name: z.string().min(1, "Name is required"),
  licenseNumber: z.string().min(1, "License number is required"),
  licenseCategory: z.string().min(1, "License category is required"),
  licenseExpiryDate: z.string().min(1, "License expiry date is required"),
  contactNumber: z.string().min(10, "Valid contact number required"),
  safetyScore: z.coerce.number().min(0).max(100).optional(),
  status: z.enum(["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"]).optional(),
});

export const tripSchema = z.object({
  source: z.string().min(1, "Source is required"),
  destination: z.string().min(1, "Destination is required"),
  vehicleId: z.string().min(1, "Vehicle is required"),
  driverId: z.string().min(1, "Driver is required"),
  cargoWeight: z.coerce.number().positive("Cargo weight must be positive"),
  plannedDistance: z.coerce.number().positive("Planned distance must be positive"),
  revenue: z.coerce.number().min(0, "Revenue must be non-negative"),
  initialOdometer: z.coerce.number().min(0, "Odometer must be non-negative"),
});

export const completeTripSchema = z.object({
  finalOdometer: z.coerce.number().positive("Final odometer is required"),
  actualDistance: z.coerce.number().positive("Actual distance is required"),
  fuelConsumed: z.coerce.number().positive("Fuel consumed is required"),
});

export const maintenanceSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
  type: z.string().min(1, "Type is required"),
  description: z.string().min(1, "Description is required"),
  cost: z.coerce.number().min(0, "Cost must be non-negative"),
  startDate: z.string().min(1, "Start date is required"),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
});

export const fuelLogSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
  tripId: z.string().optional(),
  liters: z.coerce.number().positive("Liters must be positive"),
  cost: z.coerce.number().positive("Cost must be positive"),
  date: z.string().min(1, "Date is required"),
  odometerReading: z.coerce.number().min(0, "Odometer must be non-negative"),
});

export const expenseSchema = z.object({
  vehicleId: z.string().optional(),
  tripId: z.string().optional(),
  type: z.string().min(1, "Type is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date is required"),
});
