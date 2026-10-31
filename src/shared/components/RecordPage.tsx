import { useState, type ReactNode, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Plus,
  Download,
  SlidersHorizontal,
  Pencil,
  ArrowUpRight,
  Archive,
  Trash2,
  X,
  CalendarClock,
} from "lucide-react";
import { useWorkspace } from "../hooks/useWorkspace";
import type { Entity, Module } from "../types";
import { api, ApiError } from "../utils/api";
import { csvExport } from "../utils";
import { Modal, Empty, Pagination } from "./ui";
export type FormValues = Record<string, string | number | string[]>;
export type Column<T> = { label: string; render: (record: T) => ReactNode };
export type Filter = {
  key: string;
  label: string;
  options?: { value: string; label: string }[];
  type?: "date";
};
export type RecordConfig<T extends Entity> = {
  module: Module;
  title: string;
  singular: string;
  description: string;
  columns: Column<T>[];
  filters: Filter[];
  matches: (
    record: T,
    query: string,
    filters: Record<string, string>,
  ) => boolean;
  initial: (record?: T) => FormValues;
  fields: (
    value: FormValues,
    set: (key: string, value: string | number | string[]) => void,
    record?: T,
  ) => ReactNode;
  details: (record: T) => ReactNode;
  canCreate?: boolean;
};
export default function RecordPage<T extends Entity>({
  config,
}: {
  config: RecordConfig<T>;
}) {
  const { data, refresh, notify } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1),
    [editing, setEditing] = useState<T | null | undefined>(
      params.get("new") === "1" && config.canCreate !== false
        ? null
        : undefined,
    ),
    [viewing, setViewing] = useState<T | null>(null),
    [removing, setRemoving] = useState<T | null>(null);
  const [values, setValues] = useState<FormValues>(() => config.initial()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const query = params.get("q") || "";
  const activeFilters = Object.fromEntries(params.entries());
  const records = data[config.module] as T[];
  const filtered = records.filter((r) => {
    const archived = "archived" in r && r.archived;
    return (
      (params.get("archived") === "yes" ? archived : !archived) &&
      config.matches(r, query, activeFilters)
    );
  });
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / 8)),
  );
  const changeParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
    setPage(1);
  };
  function open(record?: T) {
    setValues(config.initial(record));
    setError("");
    setFieldErrors({});
    setEditing(record || null);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      await api(
        `/${config.module}${editing ? "/" + editing.id : ""}`,
        editing ? "PUT" : "POST",
        values,
      );
      await refresh();
      notify(
        `${config.singular} ${editing ? "updated" : "created"} successfully.`,
      );
      setEditing(undefined);
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError) setFieldErrors(e.fields);
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!removing) return;
    setBusy(true);
    try {
      await api(`/${config.module}/${removing.id}`, "DELETE");
      await refresh();
      notify(
        `${config.singular} ${config.module === "appointments" ? "permanently deleted" : "archived"}.`,
      );
      setRemoving(null);
      setViewing(null);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  const set = (key: string, value: string | number | string[]) =>
    setValues((v) => ({ ...v, [key]: value }));
  const isArchived = viewing && "archived" in viewing && !!viewing.archived;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR MEDICAL CENTER, CONNECTED</div>
          <h1>
            {config.title}
            <span className="count-pill">
              {records.filter((r) => !("archived" in r && r.archived)).length}
            </span>
          </h1>
          <p>{config.description}</p>
        </div>
        <div className="heading-actions">
          <button
            className="button secondary"
            onClick={() => {
              csvExport(
                config.module,
                filtered.map((r) => ({ ...r })),
              );
              notify(
                filtered.length
                  ? "Filtered records exported."
                  : "No records to export.",
                !filtered.length,
              );
            }}
          >
            <Download size={16} />
            Export
          </button>
          <button
            className="button primary"
            disabled={config.canCreate === false}
            onClick={() => open()}
          >
            <Plus size={18} />
            Add {config.singular.toLowerCase()}
          </button>
        </div>
      </div>
      {config.canCreate === false && (
        <div className="notice">
          Add an active doctor and a patient before scheduling an appointment.
        </div>
      )}
      <section className="panel records-panel">
        <div className="records-toolbar">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label={`Search ${config.title.toLowerCase()}`}
              placeholder={`Search ${config.title.toLowerCase()}…`}
              value={query}
              onChange={(e) => changeParam("q", e.target.value)}
            />
            {query && (
              <button
                aria-label="Clear search"
                onClick={() => changeParam("q", "")}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="filters">
            <SlidersHorizontal size={16} />
            {config.filters.map((filter) =>
              filter.type === "date" ? (
                <input
                  key={filter.key}
                  type="date"
                  aria-label={filter.label}
                  value={params.get(filter.key) || ""}
                  onChange={(e) => changeParam(filter.key, e.target.value)}
                />
              ) : (
                <select
                  key={filter.key}
                  aria-label={filter.label}
                  value={params.get(filter.key) || ""}
                  onChange={(e) => changeParam(filter.key, e.target.value)}
                >
                  <option value="">{filter.label}</option>
                  {filter.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ),
            )}
            {config.module !== "appointments" && (
              <select
                aria-label="Record visibility"
                value={params.get("archived") || ""}
                onChange={(e) => changeParam("archived", e.target.value)}
              >
                <option value="">Current records</option>
                <option value="yes">Archived records</option>
              </select>
            )}
            {params.size > 0 && (
              <button
                className="text-button"
                onClick={() => {
                  setParams({});
                  setPage(1);
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
        {filtered.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {config.columns.map((c) => (
                      <th key={c.label}>{c.label}</th>
                    ))}
                    <th className="align-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered
                    .slice((currentPage - 1) * 8, currentPage * 8)
                    .map((record) => (
                      <tr key={record.id}>
                        {config.columns.map((c) => (
                          <td key={c.label}>{c.render(record)}</td>
                        ))}
                        <td>
                          <div className="row-actions">
                            <button
                              className="icon-button"
                              aria-label={`View ${record.id}`}
                              onClick={() => setViewing(record)}
                            >
                              <ArrowUpRight size={17} />
                            </button>
                            {!("archived" in record && record.archived) && (
                              <button
                                className="icon-button"
                                aria-label={`Edit ${record.id}`}
                                onClick={() => open(record)}
                              >
                                <Pencil size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={currentPage}
              total={filtered.length}
              onPage={setPage}
            />
          </>
        ) : (
          <Empty
            title={`No ${config.title.toLowerCase()} found`}
            text="Try adjusting your filters, or add a new record."
          />
        )}
      </section>
      <div className="page-footnote">
        <span className="secure-dot" />
        Your workspace is securely connected · {data.settings.timezone}
      </div>
      {editing !== undefined && (
        <Modal
          wide
          title={`${editing ? "Edit" : "Add"} ${config.singular.toLowerCase()}`}
          subtitle={
            editing
              ? `Record ${editing.id}`
              : "A little information now, better care ahead."
          }
          onClose={() => {
            if (!busy) setEditing(undefined);
          }}
        >
          <form onSubmit={save}>
            <div className="modal-body">
              <div className="form-grid">
                {config.fields(values, set, editing || undefined)}
              </div>
              {error && (
                <div className="form-error" role="alert">
                  {error}
                  {Object.keys(fieldErrors).length > 1 && (
                    <ul>
                      {Object.entries(fieldErrors).map(([key, message]) => (
                        <li key={key}>
                          {key}: {message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <span className="muted">
                All fields required unless marked optional
              </span>
              <div>
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setEditing(undefined)}
                >
                  Cancel
                </button>
                <button className="button primary" disabled={busy}>
                  {busy
                    ? "Saving…"
                    : editing
                      ? "Save changes"
                      : `Add ${config.singular.toLowerCase()}`}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
      {viewing && (
        <Modal
          wide
          title={config.singular + " details"}
          subtitle={viewing.id}
          onClose={() => setViewing(null)}
        >
          <div className="modal-body">{config.details(viewing)}</div>
          <div className="modal-footer">
            <button
              className="button danger-subtle"
              disabled={
                isArchived ||
                !!(
                  "status" in viewing &&
                  config.module === "appointments" &&
                  viewing.status !== "Cancelled"
                )
              }
              onClick={() => setRemoving(viewing)}
            >
              {config.module === "appointments" ? (
                <Trash2 size={15} />
              ) : (
                <Archive size={15} />
              )}{" "}
              {isArchived
                ? "Archived"
                : config.module === "appointments"
                  ? "Permanently delete"
                  : "Archive record"}
            </button>
            <div>
              <button
                className="button secondary"
                onClick={() => setViewing(null)}
              >
                Close
              </button>
              {!isArchived && (
                <button
                  className="button primary"
                  onClick={() => {
                    open(viewing);
                    setViewing(null);
                  }}
                >
                  {config.module === "appointments" ? (
                    <CalendarClock size={16} />
                  ) : (
                    <Pencil size={16} />
                  )}{" "}
                  {config.module === "appointments"
                    ? "Manage appointment"
                    : "Edit details"}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
      {removing && (
        <Modal
          title={
            config.module === "appointments"
              ? "Permanently delete appointment?"
              : `Archive this ${config.singular.toLowerCase()}?`
          }
          onClose={() => {
            if (!busy) setRemoving(null);
          }}
        >
          <div className="modal-body">
            <p>
              {config.module === "appointments"
                ? "This cancelled appointment will be permanently removed. This cannot be undone."
                : "The record will be removed from current lists and cannot be used for new appointments. Existing appointment history will be preserved."}
            </p>
          </div>
          <div className="modal-footer">
            <span />
            <div>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setRemoving(null)}
              >
                Keep record
              </button>
              <button
                className="button danger"
                disabled={busy}
                onClick={remove}
              >
                {busy
                  ? "Working…"
                  : config.module === "appointments"
                    ? "Delete permanently"
                    : "Archive record"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
export function DetailGrid({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="detail-grid">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
