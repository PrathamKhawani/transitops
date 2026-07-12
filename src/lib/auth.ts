import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";

export interface SessionData {
  userId: string;
  name: string;
  email: string;
  role: Role;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET || "transitops-secret-key-change-in-prod",
  cookieName: "transitops_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, // 24 hours
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session.userId) {
    return null;
  }
  return session;
}

export function getRoleRedirect(role: Role): string {
  switch (role) {
    case Role.FLEET_MANAGER:
      return "/fleet";
    case Role.DISPATCHER:
      return "/dispatch";
    case Role.SAFETY_OFFICER:
      return "/safety";
    case Role.FINANCIAL_ANALYST:
      return "/finance";
    default:
      return "/";
  }
}

export function getRoleLabel(role: Role): string {
  switch (role) {
    case Role.FLEET_MANAGER:
      return "Fleet Manager";
    case Role.DISPATCHER:
      return "Dispatcher";
    case Role.SAFETY_OFFICER:
      return "Safety Officer";
    case Role.FINANCIAL_ANALYST:
      return "Financial Analyst";
    default:
      return role;
  }
}
