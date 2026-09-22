-- Academic year becomes the study year (1-6); calendar years remain only on
-- students.acceptance_year. Bilingual names split into name_en / name_ar.

CREATE TYPE "study_level" AS ENUM ('1', '2', '3', '4', '5', '6');--> statement-breakpoint
CREATE TYPE "student_result" AS ENUM ('success', 'repeat');--> statement-breakpoint

-- faculties: bilingual name -------------------------------------------------
ALTER TABLE "faculties" RENAME COLUMN "name" TO "name_en";--> statement-breakpoint
ALTER TABLE "faculties" ADD COLUMN "name_ar" text;--> statement-breakpoint
UPDATE "faculties" SET "name_ar" = "name_en" WHERE "name_ar" IS NULL;--> statement-breakpoint
ALTER TABLE "faculties" ALTER COLUMN "name_ar" SET NOT NULL;--> statement-breakpoint

-- curriculums: bilingual name + academic_year as a study year ---------------
ALTER TABLE "curriculums" RENAME COLUMN "name" TO "name_en";--> statement-breakpoint
ALTER TABLE "curriculums" ADD COLUMN "name_ar" text;--> statement-breakpoint
UPDATE "curriculums" SET "name_ar" = "name_en" WHERE "name_ar" IS NULL;--> statement-breakpoint
ALTER TABLE "curriculums" ALTER COLUMN "name_ar" SET NOT NULL;--> statement-breakpoint
-- existing values are calendar spans ("2026/2027"); they have no study year
UPDATE "curriculums" SET "academic_year" = '1' WHERE "academic_year" !~ '^[1-6]$';--> statement-breakpoint
ALTER TABLE "curriculums" ALTER COLUMN "academic_year" TYPE "study_level" USING "academic_year"::"study_level";--> statement-breakpoint

-- students: bilingual name, academic_year as a study year, per-year status --
ALTER TABLE "students" RENAME COLUMN "name" TO "name_en";--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "name_ar" text;--> statement-breakpoint
UPDATE "students" SET "name_ar" = "name_en" WHERE "name_ar" IS NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "name_ar" SET NOT NULL;--> statement-breakpoint
-- existing values are a copy of acceptance_year ("2023"); not a study year
UPDATE "students" SET "academic_year" = '1' WHERE "academic_year" IS NULL OR "academic_year" !~ '^[1-6]$';--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "academic_year" TYPE "study_level" USING "academic_year"::"study_level";--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "academic_year" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "status" "student_result";--> statement-breakpoint

-- grades: a grade's year comes from its curriculum; term columns retired ----
ALTER TABLE "grades" DROP CONSTRAINT IF EXISTS "student_curriculum_academic_year_semester_grade_unique";--> statement-breakpoint
-- NOTE: the narrower key below fails if a student holds the same curriculum
-- more than once (previously legal across years/semesters). Inspect first:
--   SELECT student_id, curriculum_id, count(*) FROM grades
--    GROUP BY 1, 2 HAVING count(*) > 1;
-- then de-duplicate deliberately before re-running this migration.
ALTER TABLE "grades" DROP COLUMN "academic_year";--> statement-breakpoint
ALTER TABLE "grades" DROP COLUMN "semester";--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "student_curriculum_unique" UNIQUE("student_id","curriculum_id");--> statement-breakpoint

-- results: per-student per-study-year aggregate ------------------------------
ALTER TABLE "results" DROP CONSTRAINT IF EXISTS "unique_result_student_academic_year_semester";--> statement-breakpoint
UPDATE "results" SET "academic_year" = '1' WHERE "academic_year" !~ '^[1-6]$';--> statement-breakpoint
ALTER TABLE "results" ALTER COLUMN "academic_year" TYPE "study_level" USING "academic_year"::"study_level";--> statement-breakpoint
ALTER TABLE "results" DROP COLUMN "semester";--> statement-breakpoint
-- NOTE: same caveat as grades — one result row per (student, academic_year):
--   SELECT student_id, academic_year, count(*) FROM results
--    GROUP BY 1, 2 HAVING count(*) > 1;
ALTER TABLE "results" ADD CONSTRAINT "unique_result_student_year" UNIQUE("student_id","academic_year");--> statement-breakpoint

DROP TYPE IF EXISTS "semester";
