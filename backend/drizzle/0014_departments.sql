-- Faculties gain academic departments between them and their specializations
-- (not the organizational "departments" employees belong to). A specialization
-- may sit under one; a student may belong to one; a major may be tied to one
-- and is then taken by all the department's students. Results are issued per
-- specialization, per department for its students without one, and once more
-- for the students with neither. Every existing row keeps a null department,
-- so nothing changes until departments are assigned. Safe to run twice.
-- Constraints carry the names drizzle gives them, so a later push sees no difference.
CREATE TABLE IF NOT EXISTS "faculty_departments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "faculty_id" uuid NOT NULL CONSTRAINT "faculty_departments_faculty_id_faculties_id_fk" REFERENCES "faculties"("id"),
  "name_en" text NOT NULL,
  "name_ar" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "faculty_department_name_en_unique" UNIQUE ("faculty_id", "name_en"),
  CONSTRAINT "faculty_department_name_ar_unique" UNIQUE ("faculty_id", "name_ar")
);--> statement-breakpoint
ALTER TABLE "specializations" ADD COLUMN IF NOT EXISTS "department_id" uuid
  CONSTRAINT "specializations_department_id_faculty_departments_id_fk" REFERENCES "faculty_departments"("id");--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "department_id" uuid
  CONSTRAINT "students_department_id_faculty_departments_id_fk" REFERENCES "faculty_departments"("id");--> statement-breakpoint
ALTER TABLE "curriculums" ADD COLUMN IF NOT EXISTS "department_id" uuid
  CONSTRAINT "curriculums_department_id_faculty_departments_id_fk" REFERENCES "faculty_departments"("id");--> statement-breakpoint
ALTER TABLE "results" ADD COLUMN IF NOT EXISTS "department_id" uuid
  CONSTRAINT "results_department_id_faculty_departments_id_fk" REFERENCES "faculty_departments"("id");--> statement-breakpoint
-- one result per batch and specialization or department; a null still counts once
ALTER TABLE "results" DROP CONSTRAINT IF EXISTS "result_batch_unique";--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "result_batch_unique"
  UNIQUE NULLS NOT DISTINCT ("faculty_id", "academic_year", "acceptance_year", "specialization_id", "department_id", "semester", "kind");
