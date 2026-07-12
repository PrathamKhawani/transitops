import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/AppSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  if (!session) redirect("/login");

  const user = {
    name: session.name,
    email: session.email,
    role: session.role,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar user={user} />
      <main className="flex-1 overflow-y-auto" style={{ background: "#f0f4f8" }}>
        {children}
      </main>
    </div>
  );
}
