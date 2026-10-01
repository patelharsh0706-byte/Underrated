ALTER TABLE "demos" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "demos" ADD COLUMN "dodo_payment_id" text;--> statement-breakpoint
ALTER TABLE "demos" ADD CONSTRAINT "demos_dodo_payment_id_unique" UNIQUE("dodo_payment_id");