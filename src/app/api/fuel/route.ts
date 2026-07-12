import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { fuelLogSchema } from "@/lib/validations";
import { logActivity } from "@/lib/domain";

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const vehicleId = searchParams.get("vehicleId");
  const tripId = searchParams.get("tripId");

  const where: Record<string, unknown> = {};
  if (vehicleId) where.vehicleId = vehicleId;
  if (tripId) where.tripId = tripId;

  const logs = await prisma.fuelLog.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      vehicle: { select: { name: true, registrationNumber: true } },
      trip: { select: { tripCode: true } },
    },
  });

  return NextResponse.json(logs);
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const result = fuelLogSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: result.data.vehicleId } });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

  // Validate vehicle-trip relationship
  if (result.data.tripId) {
    const trip = await prisma.trip.findUnique({ where: { id: result.data.tripId } });
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    if (trip.vehicleId !== result.data.vehicleId) {
      return NextResponse.json({ error: "Trip does not belong to the selected vehicle" }, { status: 400 });
    }
  }

  const log = await prisma.fuelLog.create({
    data: { ...result.data, date: new Date(result.data.date) },
    include: {
      vehicle: { select: { name: true, registrationNumber: true } },
      trip: { select: { tripCode: true } },
    },
  });

  await logActivity(session.userId, "CREATE", "FuelLog", log.id, `Fuel log: ${result.data.liters}L for ${vehicle.name}`);

  return NextResponse.json(log, { status: 201 });
}
