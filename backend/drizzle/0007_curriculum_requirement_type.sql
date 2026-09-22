-- Each curriculum is a university, faculty or major requirement. Existing
-- curriculums are left null rather than guessed; the API requires it from now on.
CREATE TYPE "requirement_type" AS ENUM ('university', 'faculty', 'major');--> statement-breakpoint
ALTER TABLE "curriculums" ADD COLUMN IF NOT EXISTS "requirement_type" "requirement_type";
