"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import { signOut } from "@/app/actions/auth";
import { SignInGate } from "@/components/auth/sign-in-gate";
import { useMe } from "@/components/auth/use-me";
import styles from "@/components/shell/shell.module.css";

// Header: "Sign in" ↔ your X photo + menu — from the approved prototype.
// Who is signed in comes from useMe() (auth only, never game data).
export function AccountMenu() {
  const { me, myUsername } = useMe();
  const [open, setOpen] = useState(false);
  const [gate, setGate] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [open]);

  if (me === undefined) return <span className={styles.mePlaceholder} aria-hidden="true" />;

  if (!me) {
    return (
      <>
        <button type="button" className={styles.signin} onClick={() => setGate(true)}>
          Sign in
        </button>
        {gate ? (
          <SignInGate variant="signin" next={window.location.pathname + window.location.search} onClose={() => setGate(false)} />
        ) : null}
      </>
    );
  }

  return (
    <div className={styles.me} ref={wrap}>
      <button
        type="button"
        className={styles.meBtn}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Your account"
        onClick={() => setOpen((o) => !o)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- X avatar on pbs.twimg.com; not worth an images allowlist for a 42px icon */}
        {me.avatar ? <img src={me.avatar} alt="" /> : <span>{me.name.charAt(0).toUpperCase()}</span>}
      </button>
      {open ? (
        <div className={styles.menu} role="menu">
          <div className={styles.who}>
            <b>{me.name}</b>
            <small>@{me.handle} · signed in with X</small>
          </div>
          <Link href={myUsername ? `/c/${myUsername}` : "/welcome"} role="menuitem" className={styles.menuLink} onClick={() => setOpen(false)}>
            My profile
          </Link>
          <form action={signOut}>
            <button type="submit" role="menuitem">
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
