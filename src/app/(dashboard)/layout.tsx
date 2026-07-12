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
    <div className="flex min-h-screen">
      <AppSidebar user={user} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ background: "#f1f5f9" }}>
        {children}
      </main>
    </div>
  );
}
