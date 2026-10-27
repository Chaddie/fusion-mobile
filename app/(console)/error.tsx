"use client";

export default function ConsoleError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="stack">
      <h1>Something went wrong</h1>
      <p className="banner bad" role="alert">
        {error.message || "Sophos could not be reached."}
      </p>
      <button className="btn primary" type="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
