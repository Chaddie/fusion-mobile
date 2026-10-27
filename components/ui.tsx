import type { ReactNode } from "react";
import { hrefWith } from "@/lib/format";

export function Mark({ size = 36 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#2006F7" />
      <path d="M24 11.5 35 17v7.2c0 7.2-4.6 12-11 14.8-6.4-2.8-11-7.6-11-14.8V17l11-5.5Z" fill="#fff" />
      <path d="M24 20.5v9.5" stroke="#2006F7" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M19.2 25.2h9.6" stroke="#2006F7" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function PageHeader({
  title,
  lede,
  action,
}: {
  title: string;
  lede?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="back" href={href}>
      <span aria-hidden="true">←</span> {children}
    </a>
  );
}

export function Banner({ tone, children }: { tone?: "bad" | "good" | "info"; children: ReactNode }) {
  return (
    <p className={`banner ${tone ?? "info"}`} role={tone === "bad" ? "alert" : "status"}>
      {children}
    </p>
  );
}

export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}

export function Pill({ tone, children }: { tone?: string; children: ReactNode }) {
  return <span className={`pill ${tone ?? "unknown"}`}>{children}</span>;
}

export function SearchBox({
  action,
  placeholder,
  defaultValue,
  hidden,
}: {
  action: string;
  placeholder: string;
  defaultValue?: string;
  hidden?: Record<string, string | undefined>;
}) {
  return (
    <form className="search" action={action} method="get">
      {hidden
        ? Object.entries(hidden).map(([key, value]) =>
            value ? <input key={key} type="hidden" name={key} value={value} /> : null,
          )
        : null}
      <label className="sr-only" htmlFor={`search-${action.replace(/[^a-z0-9]+/gi, "-")}`}>
        {placeholder}
      </label>
      <input
        id={`search-${action.replace(/[^a-z0-9]+/gi, "-")}`}
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        enterKeyHint="search"
      />
      <button className="btn primary" type="submit">
        Search
      </button>
    </form>
  );
}

export function Chips({
  path,
  param,
  value,
  options,
  keep,
}: {
  path: string;
  param: string;
  value?: string;
  options: [string, string][];
  keep?: Record<string, string | undefined>;
}) {
  return (
    <div className="chips" aria-label="Filters">
      {options.map(([option, label]) => {
        const current = (value ?? "") === option;
        return (
          <a
            key={option || "all"}
            href={hrefWith(path, { ...keep, [param]: option || undefined })}
            aria-current={current ? "page" : undefined}
          >
            {label}
          </a>
        );
      })}
    </div>
  );
}

export function Pager({ prevHref, nextHref }: { prevHref?: string; nextHref?: string }) {
  if (!prevHref && !nextHref) return null;
  return (
    <nav className="pager" aria-label="Pages">
      {prevHref ? (
        <a className="btn ghost" href={prevHref}>
          Previous
        </a>
      ) : (
        <span />
      )}
      {nextHref ? (
        <a className="btn primary" href={nextHref}>
          Next
        </a>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
