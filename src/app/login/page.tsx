"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Truck, Eye, EyeOff, ChevronRight } from "lucide-react";

const DEMO_ACCOUNTS = [
  { role: "Fleet Manager", email: "fleet@transitops.in", password: "demo1234", color: "bg-blue-500" },
  { role: "Dispatcher", email: "dispatch@transitops.in", password: "demo1234", color: "bg-emerald-500" },
  { role: "Safety Officer", email: "safety@transitops.in", password: "demo1234", color: "bg-amber-500" },
  { role: "Financial Analyst", email: "finance@transitops.in", password: "demo1234", color: "bg-violet-500" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, confirmPassword }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Registration failed");
          return;
        }

        toast.success("Account created successfully! Please sign in.");
        setIsRegister(false);
        setPassword("");
        setConfirmPassword("");
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Login failed");
          return;
        }

        toast.success(`Welcome back, ${data.user.name}!`);
        router.push(data.redirect);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function fillCredentials(email: string, password: string) {
    setEmail(email);
    setPassword(password);
    setIsRegister(false);
    setError("");
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#f1f5f9" }}>
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[520px] xl:w-[580px] flex-col justify-between p-12" style={{ background: "#0f172a" }}>
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#2563eb" }}>
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">TransitOps</span>
          </div>

          <h1 className="text-3xl font-bold text-white mb-4 leading-tight">
            Smart Transport<br />Operations Platform
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "#94a3b8" }}>
            Replace spreadsheets with real-time fleet visibility, automated scheduling, and compliance tracking.
          </p>

          <div className="mt-12 space-y-4">
            {[
              { label: "Vehicle & Driver Management", desc: "Schedule vehicles, track maintenance, manage fleet capacity" },
              { label: "Trip Dispatch & Tracking", desc: "Create trips, dispatch vehicles, track real-time progress" },
              { label: "Safety & Compliance", desc: "Monitor licenses, safety scores, and regulatory compliance" },
              { label: "Financial Analytics", desc: "Track fuel costs, expenses, revenue, and ROI" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0" style={{ background: "#1e3a5f" }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#3b82f6" }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: "#334155" }}>
          © 2024 TransitOps · Indian Logistics Platform
        </p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#2563eb" }}>
              <Truck className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg" style={{ color: "#0f172a" }}>TransitOps</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold" style={{ color: "#0f172a" }}>
              {isRegister ? "Create your account" : "Sign in"}
            </h2>
            <p className="text-sm mt-1" style={{ color: "#64748b" }}>
              {isRegister
                ? "Register a new account to await role assignment"
                : "Enter your credentials to access the platform"}
            </p>
          </div>

          {/* Demo Accounts */}
          {!isRegister && (
            <div className="mb-6 p-4 rounded-xl border" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#64748b" }}>
                Demo Accounts — click to fill
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => fillCredentials(acc.email, acc.password)}
                    className="flex items-center gap-2 p-2.5 rounded-lg border text-left hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                    style={{ borderColor: "#e2e8f0", background: "white" }}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${acc.color}`} />
                    <div>
                      <p className="text-xs font-medium" style={{ color: "#0f172a" }}>{acc.role}</p>
                      <p className="text-xs" style={{ color: "#94a3b8" }}>demo1234</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg text-sm" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                {error}
              </div>
            )}

            {isRegister && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="John Doe"
                  className="w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  style={{ borderColor: "#d1d5db", background: "white", color: "#0f172a" }}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                style={{ borderColor: "#d1d5db", background: "white", color: "#0f172a" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow pr-10"
                  style={{ borderColor: "#d1d5db", background: "white", color: "#0f172a" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5"
                  style={{ color: "#9ca3af" }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  style={{ borderColor: "#d1d5db", background: "white", color: "#0f172a" }}
                />
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ background: loading ? "#93c5fd" : "#2563eb" }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isRegister ? "Creating account..." : "Signing in..."}
                </>
              ) : (
                <>
                  {isRegister ? "Register" : "Sign in"} <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
                setPassword("");
                setConfirmPassword("");
              }}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              {isRegister ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>

          {!isRegister && (
            <p className="text-xs text-center mt-6" style={{ color: "#9ca3af" }}>
              All demo accounts use password: <span className="font-mono font-semibold" style={{ color: "#6b7280" }}>demo1234</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
