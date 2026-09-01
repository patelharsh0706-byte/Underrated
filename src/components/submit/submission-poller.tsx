"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { checkSubmissionStatus } from "@/app/actions/creator";

const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 10;

interface SubmissionPollerProps {
  paymentId: string;
}

export function SubmissionPoller({ paymentId }: SubmissionPollerProps) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const gaveUp = attempts >= MAX_ATTEMPTS;

  useEffect(() => {
    if (gaveUp) return;

    const timer = setTimeout(async () => {
      const creator = await checkSubmissionStatus(paymentId);
      if (creator) {
        router.replace(`/c/${creator.username}`);
        return;
      }
      setAttempts((n) => n + 1);
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [attempts, gaveUp, paymentId, router]);

  if (gaveUp) {
    return (
      <p className="text-sm text-muted-foreground">
        Still processing — your payment went through. Refresh this page in a
        minute, or check the{" "}
        <a href="/leaderboard" className="underline">
          leaderboard
        </a>{" "}
        for your profile.
      </p>
    );
  }

  return (
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
  );
}
