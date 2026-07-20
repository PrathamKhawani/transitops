"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Truck, LogIn, UserPlus, ArrowRight, CheckCircle2 } from "lucide-react";

const FEATURES = [
  { icon: "🚌", title: "Real-time Fleet Management", desc: "Track every vehicle across your entire fleet instantly" },
  { icon: "⚡", title: "Smart Dispatch & Routing",  desc: "AI-powered trip assignment and optimization" },
  { icon: "🛡",  title: "Safety & Compliance",       desc: "Automated license tracking and violation alerts" },
  { icon: "📊", title: "Financial Intelligence",     desc: "Revenue, cost and ROI analytics in one view" },
];

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      if (isRegister) {
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setLoading(false);
          return;
        }
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, confirmPassword }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Registration failed"); setLoading(false); return; }
        setSuccess("Account created! Sign in to continue.");
        setIsRegister(false);
        setName(""); setPassword(""); setConfirmPassword("");
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Login failed"); setLoading(false); return; }
        router.push(data.redirect || "/");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(val: boolean) {
    setIsRegister(val);
    setError("");
    setSuccess("");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#FAFAFA",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ═══════════════════════════════════════
          LEFT PANEL — Brand Showcase
      ═══════════════════════════════════════ */}
      <div
        className="hidden md:flex"
        style={{
          width: 440,
          flexShrink: 0,
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "44px 44px 40px",
          background: "linear-gradient(135deg, #09090B 0%, #18181B 50%, #09090B 100%)",
          position: "relative",
          overflow: "hidden",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Dot grid texture */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            pointerEvents: "none",
          }}
        />

        {/* Subtle glow */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -80,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Logo */}
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 52 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Truck style={{ width: 18, height: 18, color: "#09090B" }} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                TransitOps
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#71717A",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  marginTop: 2,
                }}
              >
                Operations Platform
              </div>
            </div>
          </div>

          {/* Tagline */}
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#FFFFFF",
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
              marginBottom: 14,
            }}
          >
            Fleet Intelligence<br />
            <span style={{ color: "#3B82F6" }}>at Your Fingertips</span>
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#71717A",
              lineHeight: 1.6,
              marginBottom: 44,
              maxWidth: 320,
            }}
          >
            Manage vehicles, dispatch trips, monitor safety and track finances — all in one unified B2B platform.
          </p>

          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {icon}
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#E4E4E7",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {title}
                  </p>
                  <p style={{ fontSize: 11.5, color: "#71717A", marginTop: 2, lineHeight: 1.5 }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p
          style={{
            position: "relative",
            fontSize: 11,
            color: "#52525B",
            letterSpacing: "0.02em",
          }}
        >
          © {new Date().getFullYear()} TransitOps · Enterprise Fleet Solutions
        </p>
      </div>

      {/* ═══════════════════════════════════════
          RIGHT PANEL — Auth Form
      ═══════════════════════════════════════ */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 380 }}>

          {/* Mobile logo */}
          <div
            style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}
            className="flex md:hidden"
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "#09090B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Truck style={{ width: 18, height: 18, color: "#FFFFFF" }} />
            </div>
            <span style={{ fontSize: 17, fontWeight: 600, color: "#09090B", letterSpacing: "-0.02em" }}>
              TransitOps
            </span>
          </div>

          {/* Card */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              padding: "32px",
              boxShadow: "var(--shadow-md)",
              border: "1px solid #E4E4E7",
            }}
          >
            {/* Tab switcher */}
            <div
              style={{
                display: "flex",
                background: "#F4F4F5",
                borderRadius: 8,
                padding: 3,
                marginBottom: 24,
                border: "1px solid #E4E4E7",
              }}
            >
              {[
                { label: "Sign In", icon: LogIn, val: false },
                { label: "Register", icon: UserPlus, val: true },
              ].map(({ label, icon: Icon, val }) => {
                const active = isRegister === val;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => switchMode(val)}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "8px 0",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 500,
                      background: active ? "#FFFFFF" : "transparent",
                      color: active ? "#09090B" : "#71717A",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: active ? "var(--shadow-xs)" : "none",
                      transition: "all 0.15s ease",
                      fontFamily: "inherit",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    <Icon style={{ width: 13, height: 13 }} />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Title */}
            <div style={{ marginBottom: 20 }}>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#09090B",
                  letterSpacing: "-0.02em",
                  marginBottom: 4,
                }}
              >
                {isRegister ? "Create Account" : "Welcome back"}
              </h2>
              <p style={{ fontSize: 13, color: "#71717A" }}>
                {isRegister
                  ? "Register to request access to TransitOps"
                  : "Enter your credentials to access the platform"}
              </p>
            </div>

            {/* Alerts */}
            {error && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  background: "#FEF2F2",
                  color: "#DC2626",
                  border: "1px solid #FEE2E2",
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  fontWeight: 500,
                }}
              >
                <span style={{ fontSize: 14 }}>⚠</span>
                {error}
              </div>
            )}
            {success && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  background: "#ECFDF5",
                  color: "#059669",
                  border: "1px solid #D1FAE5",
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  fontWeight: 500,
                }}
              >
                <CheckCircle2 style={{ width: 14, height: 14, flexShrink: 0 }} />
                {success}
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              {isRegister && (
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your full name"
                    className="input-field"
                    style={inputStyle}
                  />
                </div>
              )}

              <div>
                <label style={labelStyle}>Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="input-field"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="input-field"
                    style={{ ...inputStyle, paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: 11,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#A1A1AA",
                      padding: 2,
                      display: "flex",
                    }}
                  >
                    {showPassword
                      ? <EyeOff style={{ width: 14, height: 14 }} />
                      : <Eye style={{ width: 14, height: 14 }} />}
                  </button>
                </div>
              </div>

              {isRegister && (
                <div>
                  <label style={labelStyle}>Confirm Password</label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="input-field"
                    style={inputStyle}
                  />
                </div>
              )}

              <button
                id="auth-submit"
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  borderRadius: 8,
                  marginTop: 4,
                  background: loading ? "#71717A" : "#18181B",
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 500,
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  boxShadow: "var(--shadow-xs)",
                  transition: "all 0.15s ease",
                  fontFamily: "inherit",
                  letterSpacing: "-0.01em",
                }}
              >
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "white",
                        display: "inline-block",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                    {isRegister ? "Creating account..." : "Signing in..."}
                  </span>
                ) : (
                  <>
                    {isRegister ? "Create Account" : "Sign In"}
                    <ArrowRight style={{ width: 13, height: 13 }} />
                  </>
                )}
              </button>
            </form>

            {/* Switch mode */}
            <p
              style={{
                textAlign: "center",
                marginTop: 18,
                fontSize: 13,
                color: "#71717A",
              }}
            >
              {isRegister ? "Already have an account? " : "Don't have an account? "}
              <button
                type="button"
                onClick={() => switchMode(!isRegister)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#2563EB",
                  fontWeight: 600,
                  fontSize: 13,
                  fontFamily: "inherit",
                  textDecoration: "underline",
                  textUnderlineOffset: "2px",
                }}
              >
                {isRegister ? "Sign In" : "Register"}
              </button>
            </p>
          </div>

          {/* Footer note */}
          <p
            style={{
              textAlign: "center",
              marginTop: 20,
              fontSize: 11,
              color: "#A1A1AA",
            }}
          >
            🔒 Secure · Role-based access control
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  color: "#71717A",
  marginBottom: 5,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  background: "#FFFFFF",
  color: "#09090B",
  fontSize: 13,
  border: "1px solid #E4E4E7",
  outline: "none",
  boxSizing: "border-box",
  transition: "all 0.15s ease",
  fontFamily: "'Inter', sans-serif",
};
