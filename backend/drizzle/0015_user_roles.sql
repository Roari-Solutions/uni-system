-- A user may now hold several roles, and code checks permissions instead of
-- role names. user_roles replaces employees.role_id (left nullable and unused,
-- to be dropped once nothing reads it); the permissions and role_permissions
-- tables, empty until now, get the grants that match today's behaviour:
--   admin                 -> domain.grades, grades.all-faculties, students.reinstate, users.manage
--   data-entry            -> domain.grades (pinned to the user's faculty)
--   site-content-employee -> domain.cms
-- Every existing user keeps exactly the role they had. Safe to run twice.
-- Constraints carry the names drizzle gives them, so a later push sees no difference.
CREATE TABLE IF NOT EXISTS "user_roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL CONSTRAINT "user_roles_user_id_users_id_fk" REFERENCES "users"("id"),
  "role_id" uuid NOT NULL CONSTRAINT "user_roles_role_id_roles_id_fk" REFERENCES "roles"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_role" UNIQUE ("user_id", "role_id")
);--> statement-breakpoint
INSERT INTO "roles" ("name") VALUES ('admin'), ('data-entry'), ('site-content-employee')
  ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
INSERT INTO "permissions" ("name") VALUES
  ('domain.grades'), ('grades.all-faculties'), ('students.reinstate'), ('users.manage'),
  ('domain.cms'), ('domain.management'), ('domain.teachers'), ('domain.students'), ('domain.lms')
  ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM (VALUES
  ('admin', 'domain.grades'), ('admin', 'grades.all-faculties'),
  ('admin', 'students.reinstate'), ('admin', 'users.manage'),
  ('data-entry', 'domain.grades'),
  ('site-content-employee', 'domain.cms')
) AS g("role", "permission")
JOIN "roles" r ON r."name" = g."role"
JOIN "permissions" p ON p."name" = g."permission"
ON CONFLICT ON CONSTRAINT "role_premission" DO NOTHING;--> statement-breakpoint
INSERT INTO "user_roles" ("user_id", "role_id")
SELECT "user_id", "role_id" FROM "employees" WHERE "role_id" IS NOT NULL
ON CONFLICT ON CONSTRAINT "user_role" DO NOTHING;--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "role_id" DROP NOT NULL;
