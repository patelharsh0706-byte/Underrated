"use client";

import { useEffect, useState } from "react";

import { pingVisitor } from "@/app/actions/stats";
import { buildLiveTiles, type HomeLiveCounts, type LiveRange, type LiveTile } from "@/lib/home-live";

import styles from "./home.module.css";

// Home's "Live on Underhyped" — the tabs switch over numbers the server
// already sent (no refetch), and the online count stays live through the
// same 45s visitor ping the Arena's panel uses.
const PING_INTERVAL_MS = 45_000;

const RANGES: { id: LiveRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "all", label: "All time" },
];

function Arrow({ dir }: { dir: "up" | "down" }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true" style={dir === "down" ? { transform: "rotate(180deg)" } : undefined}>
      <path d="M6 10V2M2.5 5.5 6 2l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Tile({ tile, label, tone, icon }: { tile: LiveTile; label: string; tone: string; icon: React.ReactNode }) {
  return (
    <div className={styles.tile}>
      <span className={`${styles.ico} ${tone}`}>{icon}</span>
      <div>
        <b>{tile.value.toLocaleString("en-US")}</b>
        <small>{label}</small>
      </div>
      {tile.delta ? (
        <span className={styles.delta} style={tile.delta.dir === "down" ? { color: "#dc3b40" } : undefined}>
          <Arrow dir={tile.delta.dir} />
          <span>{tile.delta.text}</span>
        </span>
      ) : (
        <span className={styles.delta} aria-hidden="true" />
      )}
    </div>
  );
}

export function LivePanel({ counts, initialOnline }: { counts: HomeLiveCounts; initialOnline: number }) {
  const [range, setRange] = useState<LiveRange>("today");
  const [online, setOnline] = useState(initialOnline);

  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      if (document.hidden) return;
      try {
        const next = await pingVisitor();
        if (!cancelled) setOnline(next.onlineNow);
      } catch {
        // A missed heartbeat just means a slightly stale count until the next tick.
      }
    };
    void ping();
    const id = window.setInterval(ping, PING_INTERVAL_MS);
    const onVisible = () => {
      if (!document.hidden) void ping();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const tiles = buildLiveTiles(counts, range);

  return (
    <section className={`${styles.card} ${styles.live}`} aria-label="Live on Underhyped">
      <div className={styles.head}>
        <div className={styles.liveTitle}>
          <h2>Live on Underhyped</h2>
          <span className={styles.online}>
            <i />
            {online.toLocaleString("en-US")} online
          </span>
        </div>
        <div className={styles.seg} role="tablist" aria-label="Time range">
          {RANGES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={range === id}
              className={range === id ? styles.isOn : undefined}
              onClick={() => setRange(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.tiles}>
        <Tile
          tile={tiles.battles}
          label="Battles fought"
          tone={styles.slate}
          icon={
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 4l9.5 9.5M4 4h3.5L17 13.5M4 4v3.5L13.5 17M20 4l-6.5 6.5M20 4h-3.5M20 4v3.5M14.5 17.5l3 3 3-3-3-3M9.5 17.5l-3 3-3-3 3-3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
        <Tile
          tile={tiles.creators}
          label="Creators in the Arena"
          tone={styles.violet}
          icon={
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="9" cy="8" r="3.6" fill="currentColor" />
              <path fill="currentColor" d="M2.5 19c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6v.5h-13z" />
              <circle cx="17" cy="9" r="2.8" fill="currentColor" opacity=".7" />
              <path fill="currentColor" opacity=".7" d="M16.5 13.2c2.9.1 5 2.1 5 5v1.3h-4.5c0-2.5-.2-4.6-.5-6.3z" />
            </svg>
          }
        />
        <Tile
          tile={tiles.people}
          label="People deciding"
          tone={styles.amber}
          icon={
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: "#e0a100" }}>
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.9" />
              <path d="M4.5 20c.9-3.7 3.9-5.6 7.5-5.6s6.6 1.9 7.5 5.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          }
        />
        <Tile
          tile={tiles.nominations}
          label="Creators nominated"
          tone={styles.green}
          icon={
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M3 10v4a1 1 0 0 0 1 1h2l1.2 5h2.6L8.7 15H9l9 4.5V4.5L9 9H4a1 1 0 0 0-1 1Z" />
              <path d="M20.5 9.5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          }
        />
      </div>
    </section>
  );
}
