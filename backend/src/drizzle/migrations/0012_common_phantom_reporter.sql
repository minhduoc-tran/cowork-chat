CREATE TABLE "task_statuses" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "task_statuses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer,
	"key" varchar(50) NOT NULL,
	"name" varchar(50) NOT NULL,
	"color" varchar(20) DEFAULT 'gray' NOT NULL,
	"position" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_statuses_conv_key_uidx" UNIQUE("conversation_id","key")
);
--> statement-breakpoint
ALTER TABLE "task_statuses" ADD CONSTRAINT "task_statuses_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_statuses_conversation_idx" ON "task_statuses" USING btree ("conversation_id");