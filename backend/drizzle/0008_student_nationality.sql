-- Students are Sudanese (national ID) or foreign (passport number). Existing
-- students are recorded as Sudanese, the only kind the system held until now.
CREATE TYPE "nationality" AS ENUM ('sudanese', 'foreign');--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "nationality" "nationality" NOT NULL DEFAULT 'sudanese';--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "passport_number" text;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_passport_number_unique" UNIQUE("passport_number");
