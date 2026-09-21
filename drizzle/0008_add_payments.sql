CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dodo_payment_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"customer_email" text,
	"customer_name" text,
	"x_profile_url" text,
	"work_url" text,
	"metadata" jsonb,
	"creator_id" uuid,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_dodo_payment_key" ON "payments" USING btree ("dodo_payment_id");--> statement-breakpoint
CREATE INDEX "payments_creator_id_idx" ON "payments" USING btree ("creator_id");--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
