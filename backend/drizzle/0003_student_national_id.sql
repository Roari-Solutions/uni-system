-- Students gain an optional national ID. Unique when present; Postgres allows
-- many NULLs in a unique index, so blank entries never collide.
ALTER TABLE "students" ADD COLUMN "national_id" text;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_national_id_unique" UNIQUE("national_id");
