"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Truck, LogOut, Clock } from "lucide-react";

export default function PendingPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        toast.success("Logged out successfully");
        router.push("/login");
      } else {
        toast.error("Logout failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#f1f5f9" }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border p-8 text-center" style={{ borderColor: "#e2e8f0" }}>
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-amber-50 text-amber-500 border" style={{ borderColor: "#fef3c7" }}>
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          <Truck className="w-6 h-6 text-blue-600" />
          <span className="font-bold text-xl text-slate-800">TransitOps</span>
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-2">Awaiting Role Assignment</h1>
        <p className="text-sm text-slate-600 mb-8 leading-relaxed">
          Your account has been created successfully. A Fleet Manager must assign you an operational role before you can access the platform features.
        </p>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold border transition-all text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-60"
          style={{ borderColor: "#d1d5db" }}
        >
          <LogOut className="w-4 h-4" />
          {loggingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </div>
  );
}
