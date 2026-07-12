import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { runDispatchChecks } from "@/lib/domain";

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "DISPATCHER") {
    return NextResponse.json({ error: "Only dispatchers can run dispatch checks" }, { status: 403 });
  }

  const { vehicleId, driverId, cargoWeight } = await request.json();

  if (!vehicleId || !driverId || cargoWeight === undefined) {
    return NextResponse.json({ error: "vehicleId, driverId, and cargoWeight are required" }, { status: 400 });
  }

  const checks = await runDispatchChecks(vehicleId, driverId, Number(cargoWeight));
  return NextResponse.json(checks);
}
