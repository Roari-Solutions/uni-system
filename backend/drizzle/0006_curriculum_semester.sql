-- Each academic year splits into two semesters, and every curriculum runs in
-- exactly one of them. Existing curriculums are placed in semester 1.
-- Guarded: a database that never dropped the 0000 "semester" type (same values) keeps it.
DO $$ BEGIN
  CREATE TYPE "semester" AS ENUM ('1', '2');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
ALTER TABLE "curriculums" ADD COLUMN IF NOT EXISTS "semester" "semester" NOT NULL DEFAULT '1';
