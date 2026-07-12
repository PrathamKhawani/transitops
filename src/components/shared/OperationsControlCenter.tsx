import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

export type AlertSeverity = "CRITICAL" | "WARNING" | "INFO";

export interface OpsAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  reason: string;
  entity: string;
  href?: string;
}

export function OperationsControlCenter({ alerts }: { alerts: OpsAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-xl p-5" style={{ border: "1px solid #e2e8f0" }}>
        <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: "1px solid #f1f5f9" }}>
          <Info className="w-5 h-5 text-blue-500" />
          <h2 className="text-sm font-semibold" style={{ color: "#0f172a" }}>Operations Control Center</h2>
        </div>
        <p className="text-sm text-center py-4" style={{ color: "#64748b" }}>No active alerts. Operations are optimal.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" style={{ color: "#334155" }} />
          <h2 className="text-sm font-semibold" style={{ color: "#0f172a" }}>Operations Control Center</h2>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "#fef2f2", color: "#b91c1c" }}>
          {alerts.filter(a => a.severity === "CRITICAL").length} Critical
        </span>
      </div>
      <div className="divide-y" style={{ borderColor: "#f1f5f9" }}>
        {alerts.map(alert => {
          const bgHover = alert.severity === "CRITICAL" ? "#fef2f2" : alert.severity === "WARNING" ? "#fffbeb" : "#f0fdf4";
          return (
            <div key={alert.id} className="p-4 flex gap-3 transition-colors hover:bg-slate-50">
              <div className="mt-0.5 flex-shrink-0">
                {alert.severity === "CRITICAL" && <AlertCircle className="w-5 h-5" style={{ color: "#ef4444" }} />}
                {alert.severity === "WARNING" && <AlertTriangle className="w-5 h-5" style={{ color: "#f59e0b" }} />}
                {alert.severity === "INFO" && <CheckCircle className="w-5 h-5" style={{ color: "#10b981" }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-sm font-semibold truncate" style={{ color: "#0f172a" }}>{alert.title}</p>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded flex-shrink-0" style={{
                    background: alert.severity === "CRITICAL" ? "#fef2f2" : alert.severity === "WARNING" ? "#fffbeb" : "#f0fdf4",
                    color: alert.severity === "CRITICAL" ? "#b91c1c" : alert.severity === "WARNING" ? "#b45309" : "#047857"
                  }}>
                    {alert.severity}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: "#64748b" }}>{alert.reason}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-medium px-2 py-0.5 rounded truncate max-w-[200px]" style={{ background: "#f1f5f9", color: "#334155" }}>
                    {alert.entity}
                  </span>
                  {alert.href && (
                    <a href={alert.href} className="text-xs font-medium hover:underline flex-shrink-0 ml-2" style={{ color: "#2563eb" }}>
                      Take Action &rarr;
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
