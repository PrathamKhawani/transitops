import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { vehicleSchema } from "@/lib/validations";
import { logActivity } from "@/lib/domain";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      trips: {
        orderBy: { createdAt: "desc" },
        include: { driver: { select: { name: true } } },
      },
      maintenanceLogs: { orderBy: { startDate: "desc" } },
      fuelLogs: {
        orderBy: { date: "desc" },
        include: { trip: { select: { tripCode: true } } },
      },
      expenses: { orderBy: { date: "desc" } },
    },
  });

  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  return NextResponse.json(vehicle);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["FLEET_MANAGER", "DISPATCHER"].includes(session.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

  // Check unique registration if changing
  if (body.registrationNumber && body.registrationNumber !== vehicle.registrationNumber) {
    const conflict = await prisma.vehicle.findUnique({
      where: { registrationNumber: body.registrationNumber },
    });
    if (conflict) {
      return NextResponse.json(
        { error: `Registration ${body.registrationNumber} is already in use` },
        { status: 409 }
      );
    }
  }

  const partial = vehicleSchema.partial().safeParse(body);
  if (!partial.success) {
    return NextResponse.json({ error: partial.error.issues[0].message }, { status: 400 });
  }

  const updated = await prisma.vehicle.update({ where: { id }, data: partial.data });
  await logActivity(session.userId, "UPDATE", "Vehicle", id, `Updated vehicle ${updated.name}`);

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "FLEET_MANAGER") {
    return NextResponse.json({ error: "Only Fleet Managers can retire vehicles" }, { status: 403 });
  }

  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  if (vehicle.status === "ON_TRIP") {
    return NextResponse.json({ error: "Cannot retire a vehicle that is currently on a trip" }, { status: 409 });
  }

  const updated = await prisma.vehicle.update({ where: { id }, data: { status: "RETIRED" } });
  await logActivity(session.userId, "RETIRE", "Vehicle", id, `Retired vehicle ${vehicle.name} (${vehicle.registrationNumber})`);

  return NextResponse.json(updated);
}
