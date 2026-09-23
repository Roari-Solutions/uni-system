-- Deciding a cheating case can also warn, suspend (1 or 2 academic years) or
-- dismiss the student. The penalties are recorded on the grade row, and a
-- suspension or dismissal also sets the student's standing, which freezes their
-- grades and results until an admin lifts it. Existing students are active.
CREATE TYPE "student_standing" AS ENUM ('active', 'suspended', 'dismissed');--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "standing" "student_standing" NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "suspension_years" integer;--> statement-breakpoint
ALTER TABLE "grades" ADD COLUMN IF NOT EXISTS "penalty_warning" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "grades" ADD COLUMN IF NOT EXISTS "penalty_suspension_years" integer;--> statement-breakpoint
ALTER TABLE "grades" ADD COLUMN IF NOT EXISTS "penalty_dismissal" boolean NOT NULL DEFAULT false;
