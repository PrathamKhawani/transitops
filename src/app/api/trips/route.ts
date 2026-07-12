import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { tripSchema } from "@/lib/validations";
import { checkVehicleEligibility, checkDriverEligibility, generateTripCode, logActivity } from "@/lib/domain";

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const vehicleId = searchParams.get("vehicleId");
  const driverId = searchParams.get("driverId");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (vehicleId) where.vehicleId = vehicleId;
  if (driverId) where.driverId = driverId;
  if (search) {
    where.OR = [
      { tripCode: { contains: search, mode: "insensitive" } },
      { source: { contains: search, mode: "insensitive" } },
      { destination: { contains: search, mode: "insensitive" } },
    ];
  }

  const trips = await prisma.trip.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      vehicle: { select: { name: true, registrationNumber: true, type: true, maximumLoadCapacity: true } },
      driver: { select: { name: true, licenseCategory: true } },
      creator: { select: { name: true } },
    },
  });

  return NextResponse.json(trips);
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "DISPATCHER") {
    return NextResponse.json({ error: "Only dispatchers can create trips" }, { status: 403 });
  }

  const body = await request.json();
  const result = tripSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { vehicleId, driverId, cargoWeight } = result.data;

  // Run all eligibility checks via domain service
  const [vehicleCheck, driverCheck] = await Promise.all([
    checkVehicleEligibility(vehicleId, cargoWeight),
    checkDriverEligibility(driverId),
  ]);

  if (!vehicleCheck.eligible) {
    return NextResponse.json({ error: vehicleCheck.reason }, { status: 409 });
  }
  if (!driverCheck.eligible) {
    return NextResponse.json({ error: driverCheck.reason }, { status: 409 });
  }

  const tripCode = await generateTripCode();

  const trip = await prisma.trip.create({
    data: { ...result.data, tripCode, createdBy: session.userId },
    include: {
      vehicle: { select: { name: true, registrationNumber: true } },
      driver: { select: { name: true } },
    },
  });

  await logActivity(session.userId, "CREATE", "Trip", trip.id, `Created trip ${tripCode}: ${trip.source} → ${trip.destination}`);

  return NextResponse.json(trip, { status: 201 });
}
