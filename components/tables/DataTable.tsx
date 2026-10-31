"use client";

import { isValidElement, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, GripVertical, Search } from "lucide-react";

type Cell = string | ReactNode;

type Props = {
  headers: string[];
  rows: Cell[][];
  /** Search box above the table. Turn it off on pages that already have their own search. */
  searchable?: boolean;
  /** Name of the downloaded CSV file (without .csv). */
  exportName?: string;
  /** Rows per page. */
  pageSize?: number;
  /** Header names of columns that hold buttons or dropdowns: no sort, search or export on them. */
  plainColumns?: string[];
};

// Columns with these headers never get sort / search / export.
const ALWAYS_PLAIN = ["", "Action", "Actions"];

/** Visible text of a cell, so JSX cells (badges, links) can be searched, sorted and exported. */
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).filter(Boolean).join(" ");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

const asNumber = (s: string) => {
  const t = s.replace(/[₹,%\s]/g, "");
  return t !== "" && /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null;
};
const asDate = (s: string) =>
  /^\d{4}-\d{2}-\d{2}/.test(s) || /^\d{1,2} [A-Za-z]{3,9},? \d{4}/.test(s) ? Date.parse(s) : NaN;

function compare(a: string, b: string) {
  const na = asNumber(a);
  const nb = asNumber(b);
  if (na !== null && nb !== null) return na - nb;
  const da = asDate(a);
  const db = asDate(b);
  if (!Number.isNaN(da) && !Number.isNaN(db)) return da - db;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function csvCell(value: string) {
  let s = value.replace(/\s+/g, " ").trim();
  // stop spreadsheet formulas (=, +, -, @) from running when the file is opened in Excel
  if (/^[=+\-@]/.test(s) && asNumber(s) === null) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadCsv(name: string, header: string[], body: string[][]) {
  const lines = [header, ...body].map((r) => r.map(csvCell).join(","));
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function pageList(current: number, pages: number): (number | string)[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const keep = [...new Set([1, pages, current - 1, current, current + 1])]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);
  const out: (number | string)[] = [];
  keep.forEach((n, i) => {
    if (i > 0 && n - keep[i - 1] > 1) out.push(`gap-${n}`);
    out.push(n);
  });
  return out;
}

/**
 * Table with serial numbers, sortable and re-orderable columns, search, row selection,
 * CSV export and pagination. Everything runs in the browser for now: when the data comes
 * from the API (thousands of rows) page, search and sort should move to the server.
 */
export default function DataTable({
  headers,
  rows,
  searchable = true,
  exportName = "export",
  pageSize = 50,
  plainColumns = [],
}: Props) {
  const plain = new Set([...ALWAYS_PLAIN, ...plainColumns]);
  const isPlain = (c: number) => plain.has(headers[c]);
  const identity = headers.map((_, i) => i);

  const [order, setOrder] = useState<number[]>(identity);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const dragFrom = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const cols = order.length === headers.length ? order : identity;

  const text = rows.map((r) => r.map(textOf));
  // A row is identified by the text of its first column (booking id, name ...), so a selection
  // stays on the right row when the rows above it change.
  const keyOf = (i: number) => text[i][0] || String(i);

  const q = query.trim().toLowerCase();
  let idx = rows.map((_, i) => i).filter((i) => !q || text[i].some((t, c) => !isPlain(c) && t.toLowerCase().includes(q)));
  if (sort) idx = [...idx].sort((a, b) => sort.dir * compare(text[a][sort.col], text[b][sort.col]) || a - b);

  const total = idx.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const visible = idx.slice(start, start + pageSize);

  const allOnPage = visible.length > 0 && visible.every((i) => selected.has(keyOf(i)));
  const selectedCount = rows.filter((_, i) => selected.has(keyOf(i))).length;

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      visible.forEach((i) => (allOnPage ? next.delete(keyOf(i)) : next.add(keyOf(i))));
      return next;
    });
  const toggleOne = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const k = keyOf(i);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const toggleSort = (col: number) => {
    setPage(1);
    setSort((s) => (s?.col !== col ? { col, dir: 1 } : s.dir === 1 ? { col, dir: -1 } : null));
  };

  const moveColumn = (from: number, to: number) => {
    if (from === to) return;
    const next = [...cols];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrder(next);
  };

  const resetDrag = () => {
    dragFrom.current = null;
    setDragging(null);
    setDragOver(null);
  };

  const exportCsv = () => {
    const exportCols = cols.filter((c) => !isPlain(c));
    const source = selectedCount ? idx.filter((i) => selected.has(keyOf(i))) : idx;
    downloadCsv(
      exportName,
      exportCols.map((c) => headers[c]),
      source.map((i) => exportCols.map((c) => text[i][c] ?? "")),
    );
  };

  const colSpan = cols.length + 2;

  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {searchable ? (
            <label className="relative block w-full max-w-xs">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                aria-label="Search table"
                className="input w-full !pl-9"
                placeholder="Search all columns…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </label>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            {selectedCount > 0 && (
              <span className="text-xs font-semibold text-slate-500">
                {selectedCount} selected ·{" "}
                <button type="button" className="underline" onClick={() => setSelected(new Set())}>
                  clear
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={exportCsv}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Download size={14} aria-hidden /> {selectedCount ? "Export selected" : "Export"}
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-max min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-10 px-4 py-4">
                  <input
                    type="checkbox"
                    aria-label="Select all rows on this page"
                    checked={allOnPage}
                    onChange={toggleAll}
                    disabled={visible.length === 0}
                  />
                </th>
                <th className="whitespace-nowrap px-4 py-4 font-black">Sr. no.</th>
                {cols.map((c, pos) => {
                  const active = sort?.col === c;
                  const label = headers[c];
                  return (
                    <th
                      key={c}
                      draggable={label !== ""}
                      onDragStart={(e) => {
                        dragFrom.current = pos;
                        setDragging(pos);
                        if (e.dataTransfer) {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", label); // Firefox only starts a drag when some data is set
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
                        if (dragOver !== pos) setDragOver(pos);
                      }}
                      onDragLeave={() => setDragOver((p) => (p === pos ? null : p))}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragFrom.current !== null) moveColumn(dragFrom.current, pos);
                        resetDrag();
                      }}
                      onDragEnd={resetDrag}
                      aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
                      className={`whitespace-nowrap px-5 py-4 font-black transition-colors ${
                        label !== "" ? "cursor-grab active:cursor-grabbing" : ""
                      } ${dragging === pos ? "opacity-40" : ""} ${
                        dragOver === pos && dragging !== pos ? "bg-orange-100" : ""
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {label !== "" && (
                          <span title="Drag to move this column" className="shrink-0">
                            <GripVertical size={16} className="text-slate-400" aria-hidden />
                          </span>
                        )}
                        {isPlain(c) ? (
                          label
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleSort(c)}
                            title={!active ? "Click to sort A to Z" : sort.dir === 1 ? "Sorted A to Z. Click for Z to A" : "Sorted Z to A. Click to clear sort"}
                            className="flex cursor-pointer items-center gap-1 font-black uppercase tracking-wider hover:text-slate-900"
                          >
                            {label}
                            {active ? (
                              sort.dir === 1 ? <ArrowUp size={15} className="text-orange-600" aria-hidden /> : <ArrowDown size={15} className="text-orange-600" aria-hidden />
                            ) : (
                              <ArrowUpDown size={15} className="text-slate-400" aria-hidden />
                            )}
                          </button>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((i, n) => (
                <tr key={i} className="table-row border-t border-slate-100">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      aria-label={`Select row ${start + n + 1}`}
                      checked={selected.has(keyOf(i))}
                      onChange={() => toggleOne(i)}
                    />
                  </td>
                  <td className="px-4 py-4 text-slate-500">{start + n + 1}</td>
                  {cols.map((c) => {
                    const cell = rows[i][c];
                    return (
                      <td key={c} className="whitespace-nowrap px-5 py-4">
                        {typeof cell === "string" ? (
                          <span className="block max-w-[260px] truncate" title={cell}>
                            {cell}
                          </span>
                        ) : (
                          cell
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {rows.length > 0 && total === 0 && (
                <tr>
                  <td colSpan={colSpan} className="px-5 py-8 text-center text-sm text-slate-500">
                    No matching records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Showing {start + 1} to {Math.min(start + pageSize, total)} of {total} records
          </span>
          {pages > 1 && (
            <nav aria-label="Pagination" className="flex items-center gap-1">
              <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)} className="rounded-lg px-2.5 py-1.5 font-bold hover:bg-slate-100 disabled:opacity-40" aria-label="Previous page">
                ‹
              </button>
              {pageList(current, pages).map((p) =>
                typeof p === "string" ? (
                  <span key={p} className="px-1">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    aria-current={p === current ? "page" : undefined}
                    onClick={() => setPage(p)}
                    className={`min-w-8 rounded-lg px-2.5 py-1.5 font-bold ${p === current ? "bg-indigo-600 text-white" : "hover:bg-slate-100"}`}
                  >
                    {p}
                  </button>
                ),
              )}
              <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)} className="rounded-lg px-2.5 py-1.5 font-bold hover:bg-slate-100 disabled:opacity-40" aria-label="Next page">
                ›
              </button>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}