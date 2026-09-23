CREATE TYPE "public"."report_category" AS ENUM('bug', 'audio_video', 'feature', 'other');--> statement-breakpoint
CREATE TABLE "report" (
	"id" text PRIMARY KEY NOT NULL,
	"category" "report_category" DEFAULT 'bug' NOT NULL,
	"content" text NOT NULL,
	"user_id" text,
	"room_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_category_idx" ON "report" USING btree ("category");--> statement-breakpoint
CREATE INDEX "report_userId_idx" ON "report" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "report_roomCode_idx" ON "report" USING btree ("room_code");--> statement-breakpoint
CREATE INDEX "report_createdAt_idx" ON "report" USING btree ("created_at");