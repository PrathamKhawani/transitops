import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getRoleRedirect } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    let user;
    try {
      user = await prisma.user.findUnique({ where: { email } });
    } catch (dbError: unknown) {
      console.error("Database connection error:", dbError);
      const msg = dbError instanceof Error ? dbError.message : String(dbError);
      // Surface a clear error when DB is unreachable (e.g. missing cloud DB on Vercel)
      if (
        msg.includes("ECONNREFUSED") ||
        msg.includes("connect ETIMEDOUT") ||
        msg.includes("Can't reach database server") ||
        msg.includes("does not exist") ||
        msg.includes("password authentication failed")
      ) {
        return NextResponse.json(
          { error: "Database unavailable. Please contact the administrator." },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "Internal server error. Please try again." },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const session = await getSession();
    session.userId = user.id;
    session.name = user.name;
    session.email = user.email;
    session.role = user.role;
    await session.save();

    // Log activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "LOGIN",
          entityType: "User",
          entityId: user.id,
          description: `${user.name} logged in`,
        },
      });
    } catch {
      // Non-critical — don't fail login if activity log fails
    }

    return NextResponse.json({
      success: true,
      redirect: getRoleRedirect(user.role),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
