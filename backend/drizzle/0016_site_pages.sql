-- Website content moves to one row per page, each a JSON document whose shape
-- the page's template in src/site-content fixes, plus every saved version.
-- The old per-page tables (main_page, about_page, ...) are left untouched.
-- The rows themselves come from `bun run seed:site`, not from this migration.
-- Safe to run twice. Constraints carry the names drizzle gives them.
CREATE TABLE IF NOT EXISTS "site_pages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL CONSTRAINT "site_pages_key_unique" UNIQUE,
  "template" text NOT NULL,
  "content" jsonb NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "updated_by" uuid CONSTRAINT "site_pages_updated_by_users_id_fk" REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "site_page_revisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "page_id" uuid NOT NULL CONSTRAINT "site_page_revisions_page_id_site_pages_id_fk" REFERENCES "site_pages"("id") ON DELETE cascade,
  "version" integer NOT NULL,
  "content" jsonb NOT NULL,
  "created_by" uuid CONSTRAINT "site_page_revisions_created_by_users_id_fk" REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "site_page_revision_unique" UNIQUE ("page_id", "version")
);
