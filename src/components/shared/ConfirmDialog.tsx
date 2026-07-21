"use client";

import { useState } from "react";
import { AlertTriangle, AlertCircle, Info, X } from "lucide-react";

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

  const isDanger = variant === "danger";
  const isWarning = variant === "warning";

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: isDanger ? "#FEF2F2" : isWarning ? "#FFFBEB" : "#EFF6FF",
                border: `1px solid ${isDanger ? "#FEE2E2" : isWarning ? "#FDE68A" : "#DBEAFE"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {isDanger ? (
                <AlertCircle className="w-4 h-4 text-red-600" />
              ) : isWarning ? (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              ) : (
                <Info className="w-4 h-4 text-blue-600" />
              )}
            </div>
            <div>
              <h3 className="modal-title">{title}</h3>
              <p style={{ fontSize: 12, color: "#71717A", marginTop: 1 }}>Confirmation Required</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body" style={{ padding: "20px 24px" }}>
          <p style={{ fontSize: 13.5, color: "#3F3F46", lineHeight: 1.5 }}>
            {description}
          </p>
        </div>

        <div className="modal-footer" style={{ padding: "16px 24px" }}>
          <button onClick={onCancel} className="btn btn-ghost">
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={isDanger ? "btn btn-danger" : isWarning ? "btn btn-primary" : "btn btn-primary"}
            style={isWarning ? { background: "#D97706" } : undefined}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
