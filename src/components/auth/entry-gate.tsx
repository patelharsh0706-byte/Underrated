"use client";

import { useRouter } from "next/navigation";

import { SignInGate } from "./sign-in-gate";

// The pop-up a signed-out visitor sees on /submit and /demos/submit
// (DECISIONS.md § 2026-10-06). X sends them back to the same page; closing it
// returns them to where the button was.

interface EntryGateProps {
  variant: "arena" | "submitDemo";
  /** This page — where X sign-in comes back to. */
  next: string;
  /** Where closing the pop-up goes. */
  back: string;
}

export function EntryGate({ variant, next, back }: EntryGateProps) {
  const router = useRouter();
  return <SignInGate variant={variant} next={next} onClose={() => router.push(back)} />;
}
