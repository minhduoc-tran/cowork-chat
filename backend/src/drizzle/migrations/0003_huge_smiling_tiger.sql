ALTER TABLE "conversation_pins" DROP CONSTRAINT "conversation_pins_conversation_id_unique";--> statement-breakpoint
ALTER TABLE "conversation_pins" ADD COLUMN "pin_order" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX "conversation_pins_conversation_order_idx" ON "conversation_pins" USING btree ("conversation_id","pin_order");--> statement-breakpoint
ALTER TABLE "conversation_pins" ADD CONSTRAINT "conversation_pins_conversation_message_uidx" UNIQUE("conversation_id","message_id");