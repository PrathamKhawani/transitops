"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Truck, LogOut, Clock, ShieldCheck, Users, ArrowRight } from "lucide-react";

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

  const steps = [
    { icon: ShieldCheck, label: "Account verified", done: true,  color: "#10b981" },
    { icon: Users,       label: "Role assignment pending", done: false, color: "#f59e0b" },
    { icon: ArrowRight,  label: "Access granted",  done: false, color: "#6366f1" },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: "#040810",
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background orbs */}
      <div style={{
        position: "fixed", top: "-20%", left: "-10%",
        width: 600, height: 600, borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)",
      }} />
      <div style={{
        position: "fixed", bottom: "-20%", right: "-10%",
        width: 600, height: 600, borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
      }} />
      {/* Grid */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(52px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(52px) rotate(-360deg); }
        }
      `}</style>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 480, position: "relative", zIndex: 1,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 28,
        padding: "44px 40px",
        backdropFilter: "blur(20px)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
        animation: "fade-in-up 0.5s ease both",
        textAlign: "center",
      }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 36 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(99,102,241,0.35)",
          }}>
            <Truck style={{ width: 18, height: 18, color: "white" }} />
          </div>
          <span style={{ color: "white", fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>TransitOps</span>
        </div>

        {/* Animated clock icon */}
        <div style={{ position: "relative", width: 88, height: 88, margin: "0 auto 32px" }}>
          {/* Pulse rings */}
          {[0, 400, 800].map(delay => (
            <div key={delay} style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              border: "2px solid rgba(245,158,11,0.3)",
              animation: `pulse-ring 2.4s ease-out ${delay}ms infinite`,
            }} />
          ))}
          {/* Center circle */}
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.25)",
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Clock style={{ width: 36, height: 36, color: "#f59e0b" }} />
          </div>
          {/* Orbiting dot */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            marginTop: -4, marginLeft: -4,
            animation: "orbit 3s linear infinite",
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 8px #f59e0b" }} />
          </div>
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize: 24, fontWeight: 800, color: "white",
          letterSpacing: "-0.03em", marginBottom: 10,
        }}>
          Awaiting Role Assignment
        </h1>
        <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 36, maxWidth: 340, margin: "0 auto 36px" }}>
          Your account has been created. A Fleet Manager will assign your operational role shortly — you&apos;ll be redirected automatically once approved.
        </p>

        {/* Progress steps */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 16, padding: "20px 24px",
          marginBottom: 28, textAlign: "left",
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: step.done ? `${step.color}20` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${step.done ? step.color + "40" : "rgba(255,255,255,0.07)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon style={{ width: 15, height: 15, color: step.done ? step.color : "#1e3a5f" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: 13, fontWeight: 600,
                    color: step.done ? "white" : i === 1 ? "#f59e0b" : "#1e3a5f",
                  }}>
                    {step.label}
                  </p>
                </div>
                {step.done && (
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: "#10b981",
                    background: "rgba(16,185,129,0.12)", padding: "2px 8px",
                    borderRadius: 100, letterSpacing: "0.06em",
                  }}>
                    DONE
                  </div>
                )}
                {i === 1 && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4,
                    fontSize: 10, fontWeight: 700, color: "#f59e0b",
                    background: "rgba(245,158,11,0.12)", padding: "2px 8px",
                    borderRadius: 100, letterSpacing: "0.06em",
                  }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: "50%", background: "#f59e0b",
                      animation: "pulse-ring 1.5s ease-out infinite",
                    }} />
                    PENDING
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            width: "100%", padding: "12px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#64748b", fontSize: 13.5, fontWeight: 600,
            cursor: loggingOut ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={e => {
            if (!loggingOut) {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.25)";
              (e.currentTarget as HTMLButtonElement).style.color = "#f87171";
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
            (e.currentTarget as HTMLButtonElement).style.color = "#64748b";
          }}
        >
          {loggingOut ? (
            <>
              <div style={{
                width: 14, height: 14, borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#64748b",
                animation: "spin 0.8s linear infinite",
              }} />
              Signing out…
            </>
          ) : (
            <>
              <LogOut style={{ width: 15, height: 15 }} />
              Sign out and return to login
            </>
          )}
        </button>

        <p style={{ marginTop: 18, fontSize: 11.5, color: "#0f172a" }}>
          Need help? Contact your Fleet Manager
        </p>
      </div>
    </div>
  );
}
