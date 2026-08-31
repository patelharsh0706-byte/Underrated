CREATE TABLE "battles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_a_id" uuid NOT NULL,
	"creator_b_id" uuid NOT NULL,
	"winner_id" uuid NOT NULL,
	"voter_session" text NOT NULL,
	"aura_a_before" integer NOT NULL,
	"aura_b_before" integer NOT NULL,
	"aura_a_after" integer NOT NULL,
	"aura_b_after" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "battles_distinct_creators" CHECK ("battles"."creator_a_id" != "battles"."creator_b_id"),
	CONSTRAINT "battles_winner_is_participant" CHECK ("battles"."winner_id" = "battles"."creator_a_id" or "battles"."winner_id" = "battles"."creator_b_id")
);
--> statement-breakpoint
CREATE TABLE "creators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"username" text NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"bio" text,
	"category" text,
	"links" jsonb,
	"aura" integer DEFAULT 1500 NOT NULL,
	"battles_count" integer DEFAULT 0 NOT NULL,
	"wins_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sponsorships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sponsor_name" text NOT NULL,
	"image_url" text NOT NULL,
	"target_url" text NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"stripe_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_creator_a_id_creators_id_fk" FOREIGN KEY ("creator_a_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_creator_b_id_creators_id_fk" FOREIGN KEY ("creator_b_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_winner_id_creators_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creators" ADD CONSTRAINT "creators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "battles_created_at_idx" ON "battles" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "battles_winner_created_at_idx" ON "battles" USING btree ("winner_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "creators_username_key" ON "creators" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "creators_user_id_key" ON "creators" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "creators_aura_idx" ON "creators" USING btree ("aura" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "creators_is_active_idx" ON "creators" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "sponsorships_start_end_idx" ON "sponsorships" USING btree ("start_at","end_at");--> statement-breakpoint
ALTER TABLE "creators" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "battles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sponsorships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "creators_select_active" ON "creators" FOR SELECT USING ("is_active" = true);--> statement-breakpoint
CREATE POLICY "sponsorships_select_active" ON "sponsorships" FOR SELECT USING ("start_at" <= now() AND "end_at" >= now());
