import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { vehicleSchema } from "@/lib/validations";
import { logActivity } from "@/lib/domain";

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const region = searchParams.get("region");
  const eligible = searchParams.get("eligible"); // for dispatch selection

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (region) where.region = region;
  if (eligible === "true") where.status = "AVAILABLE";

  const vehicles = await prisma.vehicle.findMany({
    where,
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(vehicles);
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["FLEET_MANAGER", "DISPATCHER"].includes(session.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await request.json();
  const result = vehicleSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  // Check unique registration
  const existing = await prisma.vehicle.findUnique({
    where: { registrationNumber: result.data.registrationNumber },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Vehicle with registration ${result.data.registrationNumber} already exists` },
      { status: 409 }
    );
  }

  const vehicle = await prisma.vehicle.create({ data: result.data });
  await logActivity(session.userId, "CREATE", "Vehicle", vehicle.id, `Added vehicle ${vehicle.name} (${vehicle.registrationNumber})`);

  return NextResponse.json(vehicle, { status: 201 });
}
