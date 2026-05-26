ALTER TABLE "tasks" DROP COLUMN IF EXISTS "estimated_hours";
ALTER TABLE "tasks" ADD COLUMN "estimated_value" integer;
ALTER TABLE "tasks" ADD COLUMN "estimated_unit" varchar(20);