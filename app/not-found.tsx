import Link from "next/link";

export default function NotFound() {
  return (
    <main className="sheet" style={{ minHeight: "100dvh" }}>
      <div className="sheet-inner stack">
        <h1>That page is not here</h1>
        <p className="lede">The record may have been removed, or the link is out of date.</p>
        <Link className="btn primary" href="/home">
          Back home
        </Link>
      </div>
    </main>
  );
}
