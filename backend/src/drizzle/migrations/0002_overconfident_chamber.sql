CREATE TABLE "conversation_pins" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_pins_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"message_id" integer NOT NULL,
	"pinned_by_id" integer NOT NULL,
	"pinned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_pins_conversation_id_unique" UNIQUE("conversation_id")
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "link_preview" jsonb;--> statement-breakpoint
ALTER TABLE "conversation_pins" ADD CONSTRAINT "conversation_pins_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_pins" ADD CONSTRAINT "conversation_pins_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_pins" ADD CONSTRAINT "conversation_pins_pinned_by_id_users_id_fk" FOREIGN KEY ("pinned_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_pins_conversation_idx" ON "conversation_pins" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversation_pins_message_idx" ON "conversation_pins" USING btree ("message_id");