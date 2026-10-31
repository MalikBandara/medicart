import { useEffect, useId, useRef, type ReactNode } from "react";
import { X, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { initials } from "../utils";
export function Avatar({
  name,
  size = "normal",
  doctor = false,
}: {
  name: string;
  size?: string;
  doctor?: boolean;
}) {
  return (
    <span
      className={`avatar ${size} ${doctor ? "doctor-avatar" : ""} tone-${name.length % 5}`}
    >
      {initials(name)}
    </span>
  );
}
export function Badge({ status }: { status: string }) {
  return (
    <span className={`badge ${status.toLowerCase()}`}>
      <i />
      {status}
    </span>
  );
}
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-header">
        <div>
          <h2 id={titleId}>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Field({
  label,
  children,
  help,
}: {
  label: string;
  children: ReactNode;
  help?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {help && <small>{help}</small>}
    </label>
  );
}
export function Empty({
  title = "Nothing here yet",
  text = "Try a different search or add your first record.",
  action,
}: {
  title?: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-symbol">＋</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading">
      <LoaderCircle className="spin" size={27} />
      <span>Getting your workspace ready…</span>
    </div>
  );
}
export function Pagination({
  page,
  total,
  onPage,
  size = 8,
}: {
  page: number;
  total: number;
  onPage: (n: number) => void;
  size?: number;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="pagination">
      <span>
        Showing{" "}
        <strong>
          {total ? (page - 1) * size + 1 : 0}–{Math.min(page * size, total)}
        </strong>{" "}
        of <strong>{total}</strong> results
      </span>
      <div>
        <button
          className="icon-button"
          disabled={page === 1}
          aria-label="Previous page"
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1)
          .filter((i) => i === 1 || i === pages || Math.abs(i - page) <= 1)
          .map((p, i, arr) => (
            <span key={p}>
              {i > 0 && p - arr[i - 1] > 1 && (
                <span className="page-ellipsis">…</span>
              )}
              <button
                className={`page-button ${p === page ? "selected" : ""}`}
                onClick={() => onPage(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </button>
            </span>
          ))}
        <button
          className="icon-button"
          disabled={page === pages}
          aria-label="Next page"
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
