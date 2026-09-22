CREATE TABLE "faculty_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"faculty_id" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "faculty_pages_faculty_id_unique" UNIQUE("faculty_id")
);
--> statement-breakpoint
CREATE TABLE "main_page" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "curriculums" RENAME COLUMN "code" TO "abbreviation";--> statement-breakpoint
ALTER TABLE "faculties" RENAME COLUMN "code" TO "abbreviation";--> statement-breakpoint
ALTER TABLE "curriculums" DROP CONSTRAINT "curriculums_code_unique";--> statement-breakpoint
ALTER TABLE "faculties" DROP CONSTRAINT "faculties_code_unique";--> statement-breakpoint
ALTER TABLE "grades" ALTER COLUMN "grade" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "grades" ALTER COLUMN "grade" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "academic_year" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "grades" ADD COLUMN "score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "grades" ADD COLUMN "letterGrade" text NOT NULL;--> statement-breakpoint
ALTER TABLE "results" ADD COLUMN "cgpa" numeric(3, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "faculty_pages" ADD CONSTRAINT "faculty_pages_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculums" ADD CONSTRAINT "curriculums_abbreviation_unique" UNIQUE("abbreviation");--> statement-breakpoint
ALTER TABLE "faculties" ADD CONSTRAINT "faculties_abbreviation_unique" UNIQUE("abbreviation");