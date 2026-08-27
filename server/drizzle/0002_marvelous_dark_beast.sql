CREATE TYPE "public"."room_status" AS ENUM('active', 'ended', 'scheduled');--> statement-breakpoint
CREATE TYPE "public"."room_type" AS ENUM('meet', 'audio');--> statement-breakpoint
CREATE TYPE "public"."room_user_role" AS ENUM('host', 'co_host', 'speaker', 'listener', 'participant');--> statement-breakpoint
CREATE TYPE "public"."room_user_status" AS ENUM('active', 'left', 'kicked');--> statement-breakpoint
CREATE TABLE "room" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "room_type" DEFAULT 'meet' NOT NULL,
	"status" "room_status" DEFAULT 'active' NOT NULL,
	"host_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "room_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "room_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"mic_for_all" boolean DEFAULT true NOT NULL,
	"video_for_all" boolean DEFAULT true NOT NULL,
	"screen_share_for_all" boolean DEFAULT true NOT NULL,
	"allow_chat" boolean DEFAULT true NOT NULL,
	"allow_raise_hand" boolean DEFAULT true NOT NULL,
	"max_participants" integer DEFAULT 50 NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"passcode" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "room_settings_room_id_unique" UNIQUE("room_id")
);
--> statement-breakpoint
CREATE TABLE "room_user" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "room_user_role" DEFAULT 'participant' NOT NULL,
	"status" "room_user_status" DEFAULT 'active' NOT NULL,
	"is_muted" boolean DEFAULT false NOT NULL,
	"is_video_on" boolean DEFAULT false NOT NULL,
	"is_hand_raised" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "room" ADD CONSTRAINT "room_host_id_user_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_settings" ADD CONSTRAINT "room_settings_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_user" ADD CONSTRAINT "room_user_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_user" ADD CONSTRAINT "room_user_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "room_hostId_idx" ON "room" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX "room_code_idx" ON "room" USING btree ("code");--> statement-breakpoint
CREATE INDEX "room_status_idx" ON "room" USING btree ("status");--> statement-breakpoint
CREATE INDEX "room_settings_roomId_idx" ON "room_settings" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "room_user_roomId_idx" ON "room_user" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "room_user_userId_idx" ON "room_user" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "room_user_status_idx" ON "room_user" USING btree ("status");