-- Results may cover every student at a level (no acceptance year), and a
-- student can be left off a result by hand.
ALTER TABLE "results" ALTER COLUMN "acceptance_year" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "results" ADD COLUMN IF NOT EXISTS "excluded_student_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
-- one all-acceptance-years result per level and semester too: nulls count as equal
ALTER TABLE "results" DROP CONSTRAINT IF EXISTS "result_batch_unique";--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "result_batch_unique"
  UNIQUE NULLS NOT DISTINCT ("faculty_id", "academic_year", "acceptance_year", "semester", "kind");
