"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Mark } from "@/components/ui";

const moreRoots = [
  "/more",
  "/settings",
  "/groups",
  "/device-groups",
  "/people",
  "/detections",
  "/policies",
  "/phones",
  "/email",
  "/firewalls",
];

const tabs = [
  { href: "/home", label: "Home", match: (path: string) => path === "/home" },
  { href: "/alerts", label: "Alerts", match: (path: string) => path.startsWith("/alerts") },
  { href: "/cases", label: "Cases", match: (path: string) => path.startsWith("/cases") },
  { href: "/devices", label: "Devices", match: (path: string) => path.startsWith("/devices") },
  { href: "/more", label: "More", match: (path: string) => moreRoots.some((item) => path.startsWith(item)) },
];

function Icon({ name }: { name: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "Home") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
      </svg>
    );
  }
  if (name === "Alerts") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M12 4a6 6 0 0 1 6 6c0 4 1.2 5.5 1.2 5.5H4.8S6 14 6 10a6 6 0 0 1 6-6Z" />
        <path {...common} d="M10 18.5a2 2 0 0 0 4 0" />
      </svg>
    );
  }
  if (name === "Devices") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect {...common} x="4" y="5" width="16" height="11" rx="2" />
        <path {...common} d="M8 20h8M12 16v4" />
      </svg>
    );
  }
  if (name === "Cases") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M4 8.5h16v10a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-10Z" />
        <path {...common} d="M8 8.5V6.8A1.8 1.8 0 0 1 9.8 5h4.4A1.8 1.8 0 0 1 16 6.8v1.7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="12" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="18" cy="12" r="1.3" fill="currentColor" />
    </svg>
  );
}

export function Shell({ region, children }: { region: string; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="topbar">
        <a className="brand-link" href="/home">
          <Mark size={32} />
          <span>Fusion</span>
        </a>
        <span className="region">{region}</span>
      </header>
      <nav className="tabbar" aria-label="Primary">
        {tabs.map((tab) => (
          <a key={tab.href} href={tab.href} aria-current={tab.match(pathname) ? "page" : undefined}>
            <Icon name={tab.label} />
            <span>{tab.label}</span>
          </a>
        ))}
      </nav>
      <main className="main" id="content">
        {children}
      </main>
    </div>
  );
}
