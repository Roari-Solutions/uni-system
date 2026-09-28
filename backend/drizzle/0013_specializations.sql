-- Faculties gain specializations. A student may carry one; a major requirement
-- belongs to one (majors that predate this have none and still count for the
-- whole faculty). Results are issued per specialization, with one more for the
-- students without one.
CREATE TABLE IF NOT EXISTS "specializations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "faculty_id" uuid NOT NULL REFERENCES "faculties"("id"),
  "name_en" text NOT NULL,
  "name_ar" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "specialization_name_en_unique" UNIQUE ("faculty_id", "name_en"),
  CONSTRAINT "specialization_name_ar_unique" UNIQUE ("faculty_id", "name_ar")
);--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "specialization_id" uuid REFERENCES "specializations"("id");--> statement-breakpoint
ALTER TABLE "curriculums" ADD COLUMN IF NOT EXISTS "specialization_id" uuid REFERENCES "specializations"("id");--> statement-breakpoint
ALTER TABLE "results" ADD COLUMN IF NOT EXISTS "specialization_id" uuid REFERENCES "specializations"("id");--> statement-breakpoint
-- one result per batch and specialization; a null (no specialization) still counts once
ALTER TABLE "results" DROP CONSTRAINT IF EXISTS "result_batch_unique";--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "result_batch_unique"
  UNIQUE NULLS NOT DISTINCT ("faculty_id", "academic_year", "acceptance_year", "specialization_id", "semester", "kind");
