import { redirect } from "next/navigation";
import { requireAuth, getRoleRedirect } from "@/lib/auth";

export default async function HomePage() {
  const session = await requireAuth();
  if (!session) redirect("/login");
  redirect(getRoleRedirect(session.role));
}
