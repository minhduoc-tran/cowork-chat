ALTER TABLE "tasks" ADD COLUMN "position" real;--> statement-breakpoint
CREATE INDEX "tasks_position_idx" ON "tasks" USING btree ("position");