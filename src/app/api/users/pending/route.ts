import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "FLEET_MANAGER") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  try {
    const pendingUsers = await prisma.user.findMany({
      where: { role: "PENDING" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(pendingUsers);
  } catch (error) {
    console.error("Fetch pending users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
