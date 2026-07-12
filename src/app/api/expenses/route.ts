import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { expenseSchema } from "@/lib/validations";
import { logActivity } from "@/lib/domain";

const EXPENSE_TYPES = ["TOLL", "PARKING", "MAINTENANCE", "PERMIT", "INSURANCE", "OTHER"];

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const vehicleId = searchParams.get("vehicleId");
  const tripId = searchParams.get("tripId");
  const type = searchParams.get("type");

  const where: Record<string, unknown> = {};
  if (vehicleId) where.vehicleId = vehicleId;
  if (tripId) where.tripId = tripId;
  if (type) where.type = type;

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      vehicle: { select: { name: true, registrationNumber: true } },
      trip: { select: { tripCode: true } },
    },
  });

  return NextResponse.json(expenses);
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const result = expenseSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  if (!EXPENSE_TYPES.includes(result.data.type)) {
    return NextResponse.json({ error: `Invalid expense type. Valid: ${EXPENSE_TYPES.join(", ")}` }, { status: 400 });
  }

  if (result.data.vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: result.data.vehicleId } });
    if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  if (result.data.tripId) {
    const trip = await prisma.trip.findUnique({ where: { id: result.data.tripId } });
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    if (result.data.vehicleId && trip.vehicleId !== result.data.vehicleId) {
      return NextResponse.json({ error: "Trip does not belong to the selected vehicle" }, { status: 400 });
    }
  }

  const expense = await prisma.expense.create({
    data: { ...result.data, date: new Date(result.data.date) },
    include: {
      vehicle: { select: { name: true } },
      trip: { select: { tripCode: true } },
    },
  });

  await logActivity(session.userId, "CREATE", "Expense", expense.id, `Expense: ${result.data.type} ₹${result.data.amount}`);

  return NextResponse.json(expense, { status: 201 });
}
