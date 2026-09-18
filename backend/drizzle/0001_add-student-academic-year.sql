ALTER TABLE "students" ALTER COLUMN "acceptance_year" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "curriculums" ADD COLUMN "academic_year" text NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "academic_year" text;