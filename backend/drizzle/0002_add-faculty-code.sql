ALTER TABLE "faculties" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "faculties" ADD CONSTRAINT "faculties_code_unique" UNIQUE("code");