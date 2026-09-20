import Link from "next/link";
import type { ReactNode } from "react";

/** Where every legal page sends people — the same handle as the footer. */
export function ContactLink() {
  return (
    <Link
      href="https://x.com/HarshPatel502"
      target="_blank"
      rel="noopener noreferrer"
      className="font-bold text-foreground hover:underline"
    >
      @HarshPatel502 on X
    </Link>
  );
}

// Shared "document page" treatment for Terms / Privacy / Refunds — the same
// numbered-section layout as the Rules page, minus the scribbles and the
// finale panel. Sections are plain data so the three legal pages stay copy-only.
export interface LegalSection {
  heading: string;
  body: ReactNode;
}

export function LegalPage({
  eyebrow,
  title,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <main className="relative mx-auto flex w-full max-w-[1060px] flex-1 flex-col px-4 pt-8 pb-16 sm:px-8 sm:pt-10 sm:pb-20">
      <section className="relative pt-6 pb-2 text-center sm:pt-8">
        <p className="mb-3.5 font-display text-[11.5px] font-semibold tracking-[0.22em] text-ink-soft uppercase">
          {eyebrow}
        </p>
        <h1 className="mx-auto max-w-[14ch] text-[clamp(32px,5.4vw,60px)] leading-[0.95] font-black tracking-[-0.045em] text-balance">
          {title}
        </h1>
        <p className="mt-4 text-[13.5px] text-ink-faint">Last updated: {updated}</p>
      </section>

      <article className="mx-auto mt-8 w-full max-w-[660px] pb-2">
        <div className="flex flex-col">
          {sections.map((section, i) => (
            <div
              key={section.heading}
              className={`grid grid-cols-[62px_1fr] gap-[22px] py-[26px] ${
                i === 0 ? "border-t-0 pt-2" : "border-t border-hairline"
              }`}
            >
              <span className="font-display text-[26px] leading-[1.1] font-black tracking-[-0.04em] text-ink-faint tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 className="mb-2.5 font-display text-[19px] leading-[1.25] font-extrabold tracking-[-0.025em]">
                  {section.heading}
                </h2>
                <div className="text-[15.5px] leading-[1.55] text-ink-soft [&>p]:mb-1 [&>p:last-child]:mb-0">
                  {section.body}
                </div>
              </div>
            </div>
          ))}
        </div>
      </article>
    </main>
  );
}
