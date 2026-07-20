"use client";

import { useState, useMemo } from "react";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: string[];
  emptyText?: string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  filters?: React.ReactNode;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  searchable = true,
  searchPlaceholder = "Search...",
  searchKeys,
  emptyText = "No records found",
  loading = false,
  onRowClick,
  filters,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    let result = [...data];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((row) => {
        const values = searchKeys ? searchKeys.map((k) => row[k]) : Object.values(row);
        return values.some((v) => String(v ?? "").toLowerCase().includes(q));
      });
    }
    if (sortKey) {
      result.sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av === bv) return 0;
        const cmp = String(av ?? "") < String(bv ?? "") ? -1 : 1;
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [data, search, searchKeys, sortKey, sortDir]);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {/* Toolbar */}
      {(searchable || filters) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 24px",
            borderBottom: "1px solid #E4E4E7",
            background: "#FAFAFA",
            flexWrap: "wrap",
          }}
        >
          {searchable && (
            <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 320 }}>
              <Search
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 14,
                  height: 14,
                  color: "#A1A1AA",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="input-field"
                style={{ paddingLeft: 36, paddingTop: 8, paddingBottom: 8, fontSize: 13 }}
              />
            </div>
          )}
          {filters}
          <p style={{ fontSize: 12, color: "#A1A1AA", marginLeft: "auto", whiteSpace: "nowrap", flexShrink: 0 }}>
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`th-cell ${col.className || ""}`}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => toggleSort(col.key)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "inherit",
                        fontWeight: "inherit",
                        textTransform: "inherit",
                        letterSpacing: "inherit",
                        color: "inherit",
                        padding: 0,
                      }}
                    >
                      {col.label}
                      {sortKey === col.key ? (
                        sortDir === "asc" ? (
                          <ChevronUp style={{ width: 12, height: 12, color: "#3B82F6" }} />
                        ) : (
                          <ChevronDown style={{ width: 12, height: 12, color: "#3B82F6" }} />
                        )
                      ) : (
                        <ChevronsUpDown style={{ width: 12, height: 12, opacity: 0.4 }} />
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className="td-cell">
                      <div
                        className="skeleton"
                        style={{ height: 14, borderRadius: 4, width: `${55 + Math.random() * 35}%` }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <Search style={{ width: 18, height: 18, color: "#A1A1AA" }} />
                    </div>
                    <p className="empty-state-title">{emptyText}</p>
                    {search && (
                      <p className="empty-state-sub">
                        No results for &ldquo;{search}&rdquo;
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr
                  key={i}
                  onClick={() => onRowClick?.(row)}
                  style={{ cursor: onRowClick ? "pointer" : "default" }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`td-cell ${col.className || ""}`}
                    >
                      {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
