"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import { signOut } from "@/app/actions/auth";
import { getMyProfileState } from "@/app/actions/profile";
import { SignInGate } from "@/components/auth/sign-in-gate";
import styles from "@/components/shell/shell.module.css";
import { createClient } from "@/lib/supabase/client";

// Header: "Sign in" ↔ your X photo + menu — from the approved prototype.
// Reads the auth session in the browser (auth only, never game data), so the
// cached pages behind the header stay cached.
interface Me {
  name: string;
  handle: string;
  avatar: string | null;
}

function meFrom(user: { user_metadata?: Record<string, unknown> } | null): Me | null {
  if (!user) return null;
  const m = user.user_metadata ?? {};
  const handle = String(m.user_name ?? m.preferred_username ?? "").replace(/^@/, "");
  return { name: String(m.full_name ?? m.name ?? handle), handle, avatar: typeof m.avatar_url === "string" ? m.avatar_url : null };
}

export function AccountMenu() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [gate, setGate] = useState(false);
  const [myUsername, setMyUsername] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setMe(meFrom(data.user));
      if (data.user) void getMyProfileState({}).then((st) => setMyUsername(st.myUsername));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setMe(meFrom(session?.user ?? null)));
    return () => data.subscription.unsubscribe();
  }, []);

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
