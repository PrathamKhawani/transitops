import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData } from "@/lib/auth";
import { Role } from "@prisma/client";

const sessionOptions = {
  password: process.env.SESSION_SECRET || "transitops-secret-key-change-in-prod",
  cookieName: "transitops_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

const ROLE_REDIRECTS: Record<Role, string> = {
  PENDING: "/pending",
  FLEET_MANAGER: "/fleet",
  DISPATCHER: "/dispatch",
  SAFETY_OFFICER: "/safety",
  FINANCIAL_ANALYST: "/finance",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (pathname === "/login" || pathname === "/pending" || pathname.startsWith("/api/auth")) {
    // But if logged in and not pending, block /pending access
    if (pathname === "/pending" || pathname === "/login") {
      const session = await getIronSession<SessionData>(
        request.cookies as unknown as {
          get: (name: string) => { name: string; value: string } | undefined;
          set: {
            (name: string, value: string, cookie?: unknown): void;
            (options: unknown): void;
          };
        },
        sessionOptions
      );
      if (session.userId) {
        if (session.role === "PENDING") {
          if (pathname === "/login") return NextResponse.redirect(new URL("/pending", request.url));
          return NextResponse.next();
        } else {
          return NextResponse.redirect(new URL(ROLE_REDIRECTS[session.role], request.url));
        }
      }
    }
    return NextResponse.next();
  }

  // Protect dashboard and API routes
  if (pathname.startsWith("/fleet") || pathname.startsWith("/dispatch") ||
      pathname.startsWith("/safety") || pathname.startsWith("/finance") ||
      pathname.startsWith("/api/") || pathname === "/") {

    const response = NextResponse.next();
    const session = await getIronSession<SessionData>(
      request.cookies as unknown as {
        get: (name: string) => { name: string; value: string } | undefined;
        set: {
          (name: string, value: string, cookie?: unknown): void;
          (options: unknown): void;
        };
      },
      sessionOptions
    );

    if (!session.userId) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Block PENDING users from operational routes/APIs
    if (session.role === "PENDING") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden. Awaiting Role Assignment." }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/pending", request.url));
    }

    // Redirect root to role-specific dashboard
    if (pathname === "/") {
      return NextResponse.redirect(new URL(ROLE_REDIRECTS[session.role], request.url));
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
