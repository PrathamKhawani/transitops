import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/layout/AppSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  if (!session) redirect("/login");

  // Fetch latest name directly from database
  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, role: true },
  });

  const user = {
    name: dbUser?.name || session.name,
    email: dbUser?.email || session.email,
    role: dbUser?.role || session.role,
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
