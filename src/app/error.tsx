"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        Something went wrong
      </h1>
      <p className="text-sm text-ink-soft">
        The page couldn&rsquo;t load. Try again.
      </p>
      <button
        onClick={() => reset()}
        className="mt-2 rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background transition-colors hover:bg-foreground/80"
      >
        Try again
      </button>
    </main>
  );
}
