CREATE TABLE "equipped" (
	"user_id" text,
	"slot" text,
	"item_id" text NOT NULL,
	CONSTRAINT "equipped_pkey" PRIMARY KEY("user_id","slot")
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"user_id" text,
	"item_id" text,
	"acquired_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_pkey" PRIMARY KEY("user_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"user_id" text PRIMARY KEY,
	"display_name" text NOT NULL,
	"gems" integer DEFAULT 0 NOT NULL,
	"last_daily_claim" date,
	"gems_earned_today" integer DEFAULT 0 NOT NULL,
	"earn_day" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"game_id" text NOT NULL,
	"score" integer NOT NULL,
	"gems_awarded" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"reference" text UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "scores_game_score_idx" ON "scores" ("game_id","score");--> statement-breakpoint
ALTER TABLE "equipped" ADD CONSTRAINT "equipped_user_id_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "players"("user_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_user_id_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "players"("user_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_user_id_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "players"("user_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "players"("user_id") ON DELETE CASCADE;