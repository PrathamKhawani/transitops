import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logActivity } from "@/lib/domain";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "FLEET_MANAGER") {
    return NextResponse.json({ error: "Only Fleet Managers can update maintenance logs" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action, status, cost } = body;

  const log = await prisma.maintenanceLog.findUnique({
    where: { id },
    include: { vehicle: true },
  });
  if (!log) return NextResponse.json({ error: "Maintenance log not found" }, { status: 404 });

  if (action === "start") {
    // Mark IN_PROGRESS + set vehicle IN_SHOP
    if (log.status !== "SCHEDULED") {
      return NextResponse.json({ error: "Can only start SCHEDULED maintenance" }, { status: 400 });
    }
    if (log.vehicle.status === "ON_TRIP") {
      return NextResponse.json({ error: `${log.vehicle.name} is on a trip and cannot enter maintenance` }, { status: 409 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedLog = await tx.maintenanceLog.update({
        where: { id },
        data: { status: "IN_PROGRESS" },
      });
      await tx.vehicle.update({ where: { id: log.vehicleId }, data: { status: "IN_SHOP" } });
      return updatedLog;
    });

    await logActivity(session.userId, "START_MAINTENANCE", "Maintenance", id, `Started ${log.type} on ${log.vehicle.name}`);
    return NextResponse.json(updated);
  }

  if (action === "complete") {
    if (!["IN_PROGRESS", "SCHEDULED"].includes(log.status)) {
      return NextResponse.json({ error: "Can only complete IN_PROGRESS or SCHEDULED maintenance" }, { status: 400 });
    }

    const finalCost = cost ?? log.cost;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedLog = await tx.maintenanceLog.update({
        where: { id },
        data: { status: "COMPLETED", completedDate: new Date(), cost: finalCost },
      });
      // Restore vehicle to AVAILABLE unless RETIRED
      if (log.vehicle.status !== "RETIRED") {
        await tx.vehicle.update({ where: { id: log.vehicleId }, data: { status: "AVAILABLE" } });
      }
      return updatedLog;
    });

    await logActivity(session.userId, "COMPLETE_MAINTENANCE", "Maintenance", id, `Completed ${log.type} on ${log.vehicle.name}`);
    return NextResponse.json(updated);
  }

  if (action === "cancel") {
    if (log.status === "COMPLETED") {
      return NextResponse.json({ error: "Cannot cancel completed maintenance" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedLog = await tx.maintenanceLog.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      if (log.vehicle.status === "IN_SHOP") {
        await tx.vehicle.update({ where: { id: log.vehicleId }, data: { status: "AVAILABLE" } });
      }
      return updatedLog;
    });

    await logActivity(session.userId, "CANCEL_MAINTENANCE", "Maintenance", id, `Cancelled ${log.type} on ${log.vehicle.name}`);
    return NextResponse.json(updated);
  }

  // General field update (cost, description, etc.)
  const updated = await prisma.maintenanceLog.update({
    where: { id },
    data: { ...body, action: undefined },
  });
  return NextResponse.json(updated);
}
