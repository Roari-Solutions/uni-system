-- Curriculum codes drop the dash: XXXX-0000 becomes XXXX0000. Only codes in the
-- old format are touched; removing the dash keeps them unique, since every
-- other character stays in place. Reverse with:
--   UPDATE "curriculums" SET "abbreviation" = substr("abbreviation", 1, 4) || '-' || substr("abbreviation", 5)
--   WHERE "abbreviation" ~ '^[A-Z]{4}[1-6][12][0-9]{2}$';
UPDATE "curriculums"
SET "abbreviation" = replace("abbreviation", '-', '')
WHERE "abbreviation" ~ '^[A-Z]{4}-[1-6][12][0-9]{2}$';
