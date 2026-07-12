import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { completeTripSchema } from "@/lib/validations";
import { checkVehicleEligibility, checkDriverEligibility, logActivity } from "@/lib/domain";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      vehicle: true,
      driver: true,
      creator: { select: { name: true, role: true } },
      fuelLogs: { orderBy: { date: "desc" } },
      expenses: { orderBy: { date: "desc" } },
    },
  });

  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json(trip);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "DISPATCHER") {
    return NextResponse.json({ error: "Only dispatchers can modify trips" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action, ...data } = body;

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { vehicle: true, driver: true },
  });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  // ─── DISPATCH ─────────────────────────────────────────────────────────────
  if (action === "dispatch") {
    if (trip.status !== "DRAFT") {
      return NextResponse.json({ error: "Only DRAFT trips can be dispatched" }, { status: 400 });
    }

    // Re-run ALL domain checks at dispatch time (rules 2-11)
    const [vehicleCheck, driverCheck] = await Promise.all([
      checkVehicleEligibility(trip.vehicleId, trip.cargoWeight),
      checkDriverEligibility(trip.driverId),
    ]);

    if (!vehicleCheck.eligible) {
      return NextResponse.json({ error: vehicleCheck.reason }, { status: 409 });
    }
    if (!driverCheck.eligible) {
      return NextResponse.json({ error: driverCheck.reason }, { status: 409 });
    }

    // Rule 10: Capacity check at dispatch
    if (trip.cargoWeight > trip.vehicle.maximumLoadCapacity) {
      const excess = (trip.cargoWeight - trip.vehicle.maximumLoadCapacity).toFixed(1);
      return NextResponse.json({
        error: `Cargo exceeds ${trip.vehicle.name}'s maximum load capacity by ${excess}T`,
      }, { status: 400 });
    }

    // Rule 11: Atomic dispatch
    const updated = await prisma.$transaction(async (tx) => {
      const updatedTrip = await tx.trip.update({
        where: { id },
        data: { status: "DISPATCHED", dispatchedAt: new Date() },
      });
      await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: "ON_TRIP" } });
      await tx.driver.update({ where: { id: trip.driverId }, data: { status: "ON_TRIP" } });
      return updatedTrip;
    });

    await logActivity(session.userId, "DISPATCH", "Trip", id, `Dispatched trip ${trip.tripCode}: ${trip.source} → ${trip.destination}`);
    return NextResponse.json(updated);
  }

  // ─── COMPLETE ─────────────────────────────────────────────────────────────
  if (action === "complete") {
    if (trip.status !== "DISPATCHED") {
      return NextResponse.json({ error: "Only DISPATCHED trips can be completed" }, { status: 400 });
    }

    const result = completeTripSchema.safeParse(data);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    // Rule 12: Validate final odometer
    if (result.data.finalOdometer < trip.initialOdometer) {
      return NextResponse.json({
        error: `Final odometer (${result.data.finalOdometer} km) cannot be less than initial odometer (${trip.initialOdometer} km)`,
      }, { status: 400 });
    }

    // Rule 12: Atomic complete
    const updated = await prisma.$transaction(async (tx) => {
      const updatedTrip = await tx.trip.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          finalOdometer: result.data.finalOdometer,
          actualDistance: result.data.actualDistance,
          fuelConsumed: result.data.fuelConsumed,
        },
      });
      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: "AVAILABLE", odometer: result.data.finalOdometer },
      });
      await tx.driver.update({ where: { id: trip.driverId }, data: { status: "AVAILABLE" } });
      return updatedTrip;
    });

    await logActivity(session.userId, "COMPLETE", "Trip", id, `Completed trip ${trip.tripCode}`);
    return NextResponse.json(updated);
  }

  // ─── CANCEL ──────────────────────────────────────────────────────────────
  if (action === "cancel") {
    if (trip.status === "COMPLETED") {
      return NextResponse.json({ error: "Cannot cancel a completed trip" }, { status: 400 });
    }
    if (trip.status === "CANCELLED") {
      return NextResponse.json({ error: "Trip is already cancelled" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedTrip = await tx.trip.update({ where: { id }, data: { status: "CANCELLED" } });
      // Rule 13: DISPATCHED → restore vehicle+driver
      if (trip.status === "DISPATCHED") {
        await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: "AVAILABLE" } });
        await tx.driver.update({ where: { id: trip.driverId }, data: { status: "AVAILABLE" } });
      }
      // Rule 14: DRAFT → only cancel trip (no vehicle/driver state change needed)
      return updatedTrip;
    });

    await logActivity(session.userId, "CANCEL", "Trip", id, `Cancelled trip ${trip.tripCode}`);
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action. Valid: dispatch | complete | cancel" }, { status: 400 });
}
