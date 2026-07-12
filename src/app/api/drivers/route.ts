import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { driverSchema } from "@/lib/validations";
import { getLicenseState, logActivity } from "@/lib/domain";

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const eligible = searchParams.get("eligible");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (eligible === "true") {
    // Available + valid license
    where.status = "AVAILABLE";
    where.licenseExpiryDate = { gt: new Date() };
  }

  const drivers = await prisma.driver.findMany({
    where,
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  // Add computed licenseState
  const withState = drivers.map((d) => ({
    ...d,
    licenseState: getLicenseState(d.licenseExpiryDate),
  }));

  return NextResponse.json(withState);
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SAFETY_OFFICER", "FLEET_MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Only Safety Officers can add drivers" }, { status: 403 });
  }

  const body = await request.json();
  const result = driverSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const existing = await prisma.driver.findUnique({
    where: { licenseNumber: result.data.licenseNumber },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Driver with license ${result.data.licenseNumber} already exists` },
      { status: 409 }
    );
  }

  const driver = await prisma.driver.create({
    data: {
      ...result.data,
      licenseExpiryDate: new Date(result.data.licenseExpiryDate),
    },
  });
  await logActivity(session.userId, "CREATE", "Driver", driver.id, `Added driver ${driver.name}`);

  return NextResponse.json({ ...driver, licenseState: getLicenseState(driver.licenseExpiryDate) }, { status: 201 });
}
