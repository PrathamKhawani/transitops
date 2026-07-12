import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "FLEET_MANAGER") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { role } = body;

    // Validate role
    if (!role || !Object.values(Role).includes(role as Role)) {
      return NextResponse.json({ error: "Invalid role assigned" }, { status: 400 });
    }

    // Block self-role change
    if (session.userId === id) {
      return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role: role as Role },
    });

    // Log role assignment in ActivityLog
    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        action: "ROLE_ASSIGNMENT",
        entityType: "User",
        entityId: id,
        description: `Assigned role ${role} to user ${targetUser.name} (${targetUser.email})`,
      },
    });

    return NextResponse.json({
      success: true,
      user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role },
    });
  } catch (error) {
    console.error("Update user role error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
