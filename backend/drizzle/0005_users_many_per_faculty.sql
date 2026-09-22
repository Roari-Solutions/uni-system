-- A faculty may have any number of users. The unique constraint allowed exactly
-- one, which made it impossible to add staff under a faculty.
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_faculty_id_unique";--> statement-breakpoint
-- the column is still looked up per request by GrGurdGuard, so keep it indexed
CREATE INDEX IF NOT EXISTS "users_faculty_id_idx" ON "users" ("faculty_id");
