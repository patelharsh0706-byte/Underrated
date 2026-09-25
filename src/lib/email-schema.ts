import { z } from "zod";

// Shared by the subscribeEmail Server Action and its tests. DATABASE.md
// § email_signups: the address is trimmed and lower-cased before insert, so
// "A@x.com" and "a@x.com" are one row.
export const EMAIL_SOURCES = ["drop", "footer"] as const;
export type EmailSource = (typeof EMAIL_SOURCES)[number];

/** Per-session cap on new rows per UTC day — DATABASE.md § email_signups. */
export const EMAIL_SIGNUPS_PER_SESSION_PER_DAY = 5;

export const subscribeEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .pipe(z.email()),
  source: z.enum(EMAIL_SOURCES),
});

export type SubscribeEmailInput = z.input<typeof subscribeEmailSchema>;
