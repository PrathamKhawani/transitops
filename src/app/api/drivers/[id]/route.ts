import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { driverSchema } from "@/lib/validations";
import { getLicenseState, logActivity } from "@/lib/domain";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const driver = await prisma.driver.findUnique({
    where: { id },
    include: {
      trips: {
        orderBy: { createdAt: "desc" },
        include: {
          vehicle: { select: { name: true, registrationNumber: true } },
        },
      },
    },
  });

  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  return NextResponse.json({ ...driver, licenseState: getLicenseState(driver.licenseExpiryDate) });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SAFETY_OFFICER", "FLEET_MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

  if (body.licenseNumber && body.licenseNumber !== driver.licenseNumber) {
    const conflict = await prisma.driver.findUnique({ where: { licenseNumber: body.licenseNumber } });
    if (conflict) {
      return NextResponse.json({ error: `License ${body.licenseNumber} already in use` }, { status: 409 });
    }
  }

  const partial = driverSchema.partial().safeParse(body);
  if (!partial.success) {
    return NextResponse.json({ error: partial.error.issues[0].message }, { status: 400 });
  }

  const data: Record<string, unknown> = { ...partial.data };
  if (data.licenseExpiryDate) {
    data.licenseExpiryDate = new Date(data.licenseExpiryDate as string);
  }

  const updated = await prisma.driver.update({ where: { id }, data });
  await logActivity(session.userId, "UPDATE", "Driver", id, `Updated driver ${updated.name}`);

  return NextResponse.json({ ...updated, licenseState: getLicenseState(updated.licenseExpiryDate) });
}
