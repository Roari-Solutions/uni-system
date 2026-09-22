-- The abbreviation is the curriculum's identifier; names become free text so
-- that several curriculums may share the "-" English-name placeholder.
ALTER TABLE "curriculums" DROP CONSTRAINT IF EXISTS "curriculums_name_en_unique";
