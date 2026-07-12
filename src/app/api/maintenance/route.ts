import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { maintenanceSchema } from "@/lib/validations";
import { logActivity } from "@/lib/domain";

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const vehicleId = searchParams.get("vehicleId");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (vehicleId) where.vehicleId = vehicleId;

  const logs = await prisma.maintenanceLog.findMany({
    where,
    orderBy: { startDate: "desc" },
    include: { vehicle: { select: { name: true, registrationNumber: true } } },
  });

  return NextResponse.json(logs);
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "FLEET_MANAGER") {
    return NextResponse.json({ error: "Only Fleet Managers can create maintenance logs" }, { status: 403 });
  }

  const body = await request.json();
  const result = maintenanceSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: result.data.vehicleId } });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

  if (vehicle.status === "ON_TRIP") {
    return NextResponse.json({ error: `${vehicle.name} is currently ON_TRIP and cannot enter maintenance` }, { status: 409 });
  }
  if (vehicle.status === "RETIRED") {
    return NextResponse.json({ error: `${vehicle.name} is retired` }, { status: 409 });
  }

  const status = result.data.status ?? "SCHEDULED";

  // If IN_PROGRESS, atomically set vehicle to IN_SHOP
  const log = await prisma.$transaction(async (tx) => {
    const newLog = await tx.maintenanceLog.create({
      data: {
        vehicleId: result.data.vehicleId,
        type: result.data.type,
        description: result.data.description,
        cost: result.data.cost,
        startDate: new Date(result.data.startDate),
        status,
      },
    });

    if (status === "IN_PROGRESS") {
      await tx.vehicle.update({ where: { id: result.data.vehicleId }, data: { status: "IN_SHOP" } });
    }

    return newLog;
  });

  await logActivity(
    session.userId, "CREATE", "Maintenance", log.id,
    `Created ${result.data.type} maintenance for ${vehicle.name} — status: ${status}`
  );

  return NextResponse.json(log, { status: 201 });
}
