export default function ConsoleNotFound() {
  return (
    <div className="stack">
      <h1>Not found</h1>
      <p className="lede">That record is not in the tenant, or the link is out of date.</p>
      <a className="btn primary" href="/home">
        Back home
      </a>
    </div>
  );
}
