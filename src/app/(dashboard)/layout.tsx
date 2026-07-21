import { redirect } from "next/navigation";
import { getSession, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/layout/AppSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  if (!session) redirect("/login");

  // Always fetch latest name/role from database — heals stale session cookies
  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, role: true },
  });

  // If DB name differs from session cookie, refresh the cookie silently
  if (dbUser && dbUser.name !== session.name) {
    const liveSession = await getSession();
    liveSession.name = dbUser.name;
    liveSession.email = dbUser.email;
    liveSession.role = dbUser.role;
    await liveSession.save();
  }

  const user = {
    name: dbUser?.name ?? session.name,
    email: dbUser?.email ?? session.email,
    role: dbUser?.role ?? session.role,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar user={user} />
      <main className="flex-1 overflow-y-auto" style={{ background: "#FAFAFA" }}>
        {children}
      </main>
    </div>
  );
}
