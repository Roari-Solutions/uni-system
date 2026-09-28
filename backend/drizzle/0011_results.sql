-- Results export: board results (نتيجة المجالس) are generated per batch and
-- semester, approved, then printed as the final results; Sup & Sub re-exams
-- follow the same cycle.
--
-- Two new seating statuses: barred (scores 0, like an absence) and substitute
-- (an accepted excuse: no mark until the substitute exam).
ALTER TYPE "seating_status" ADD VALUE IF NOT EXISTS 'barred';--> statement-breakpoint
ALTER TYPE "seating_status" ADD VALUE IF NOT EXISTS 'substitute';--> statement-breakpoint
CREATE TYPE "resit_kind" AS ENUM ('supplementary', 'substitute');--> statement-breakpoint
CREATE TYPE "result_kind" AS ENUM ('regular', 'resit');--> statement-breakpoint
CREATE TYPE "result_status" AS ENUM ('pending', 'approved');--> statement-breakpoint

-- A Sup & Sub re-exam mark sits beside the original; `gp` follows the resit letter.
ALTER TABLE "grades" ADD COLUMN IF NOT EXISTS "resit_kind" "resit_kind";--> statement-breakpoint
ALTER TABLE "grades" ADD COLUMN IF NOT EXISTS "resit_grade" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "grades" ADD COLUMN IF NOT EXISTS "resit_letter" "letter_grade";--> statement-breakpoint

-- S.No.: a curriculum's column number on the results sheets, per faculty -> year -> semester.
-- The API numbers existing placements on startup (in code order); this does the same in SQL.
ALTER TABLE "faculty_curriculums" ADD COLUMN IF NOT EXISTS "serial_no" integer;--> statement-breakpoint
UPDATE "faculty_curriculums" AS fc
SET "serial_no" = numbered.n
FROM (
  SELECT l."id", row_number() OVER (
    PARTITION BY l."faculty_id", c."academic_year", c."semester"
    ORDER BY c."abbreviation"
  ) AS n
  FROM "faculty_curriculums" l
  JOIN "curriculums" c ON c."id" = l."curriculum_id"
) AS numbered
WHERE fc."id" = numbered."id" AND fc."serial_no" IS NULL;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "faculty_id" uuid NOT NULL REFERENCES "faculties"("id"),
  "academic_year" "study_level" NOT NULL,
  "acceptance_year" text NOT NULL,
  "semester" "semester" NOT NULL,
  "kind" "result_kind" NOT NULL,
  "status" "result_status" DEFAULT 'pending' NOT NULL,
  "header" jsonb NOT NULL,
  "sheet" jsonb NOT NULL,
  "approved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "result_batch_unique" UNIQUE ("faculty_id", "academic_year", "acceptance_year", "semester", "kind")
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "result_students" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "result_id" uuid NOT NULL REFERENCES "results"("id") ON DELETE CASCADE,
  "student_id" uuid NOT NULL REFERENCES "students"("id"),
  CONSTRAINT "result_student_unique" UNIQUE ("result_id", "student_id")
);
