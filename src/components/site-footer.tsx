import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="flex items-center justify-center border-t-2 border-foreground px-4 py-4 text-sm text-muted-foreground sm:px-8">
      <Link
        href="https://x.com/HarshPatel502"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
      >
        Made with love <span className="text-aura">@HarshPatel502</span>
      </Link>
    </footer>
  );
}
