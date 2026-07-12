"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const confirmBg = variant === "danger" ? "#dc2626" : variant === "warning" ? "#d97706" : "#2563eb";

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" style={{ border: "1px solid #e2e8f0" }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: variant === "danger" ? "#fef2f2" : variant === "warning" ? "#fffbeb" : "#eff6ff" }}>
            <AlertTriangle className="w-4 h-4"
              style={{ color: variant === "danger" ? "#dc2626" : variant === "warning" ? "#d97706" : "#2563eb" }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "#0f172a" }}>{title}</h3>
            <p className="text-sm mt-1" style={{ color: "#64748b" }}>{description}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-slate-50"
            style={{ borderColor: "#e2e8f0", color: "#374151" }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60"
            style={{ background: confirmBg }}
          >
            {loading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
