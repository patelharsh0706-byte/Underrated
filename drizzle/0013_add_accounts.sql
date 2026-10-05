CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"x_user_id" text NOT NULL,
	"x_username" text NOT NULL,
	"x_name" text,
	"x_avatar_url" text,
	"email" text,
	"creator_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "battles" ADD COLUMN "voter_user_id" uuid;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "x_user_id" text;--> statement-breakpoint
ALTER TABLE "demo_judgements" ADD COLUMN "voter_user_id" uuid;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_x_user_id_key" ON "accounts" USING btree ("x_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_creator_id_key" ON "accounts" USING btree ("creator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "battles_account_pair_key" ON "battles" USING btree ("voter_user_id",least("creator_a_id", "creator_b_id"),greatest("creator_a_id", "creator_b_id")) WHERE "battles"."voter_user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "creators_x_user_id_key" ON "creators" USING btree ("x_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "demo_judgements_demo_account_key" ON "demo_judgements" USING btree ("demo_id","voter_user_id") WHERE "demo_judgements"."voter_user_id" is not null;--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
