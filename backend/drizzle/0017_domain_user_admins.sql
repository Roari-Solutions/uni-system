-- User management is split by domain: the grades admin manages data entry only,
-- a new cms-admin role manages content managers, and a new super-admin role
-- manages every domain's users. The grades admin's `users.manage` permission
-- becomes `users.manage.grades`; nobody is made super admin here (see
-- `bun run grant-role`). Safe to run twice.
UPDATE "permissions" SET "name" = 'users.manage.grades'
  WHERE "name" = 'users.manage'
  AND NOT EXISTS (SELECT 1 FROM "permissions" WHERE "name" = 'users.manage.grades');--> statement-breakpoint
-- if the app already added the new name on startup, the old one just goes
DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "name" = 'users.manage');--> statement-breakpoint
DELETE FROM "permissions" WHERE "name" = 'users.manage';--> statement-breakpoint
INSERT INTO "roles" ("name") VALUES ('cms-admin'), ('super-admin')
  ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
INSERT INTO "permissions" ("name") VALUES ('users.manage.grades'), ('users.manage.cms'), ('users.manage.all')
  ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM (VALUES
  ('admin', 'users.manage.grades'),
  ('cms-admin', 'domain.cms'), ('cms-admin', 'users.manage.cms'),
  ('super-admin', 'users.manage.all'), ('super-admin', 'domain.grades'),
  ('super-admin', 'grades.all-faculties'), ('super-admin', 'students.reinstate'),
  ('super-admin', 'domain.cms')
) AS g("role", "permission")
JOIN "roles" r ON r."name" = g."role"
JOIN "permissions" p ON p."name" = g."permission"
ON CONFLICT ON CONSTRAINT "role_premission" DO NOTHING;
