-- Brings saved website content to the templates that let the dean's message be
-- signed, in the pages and in their saved versions:
--   * the student affairs and libraries deanships' dean's message gains the
--     dean's name, position and photo, left empty (hidden on the website until
--     an editor fills them in).
-- Safe to run twice: content already in the new shape is left as it is.
-- Run with psql (the helper lives in pg_temp, for this session only).

CREATE FUNCTION pg_temp.reshape(page_key text, c jsonb) RETURNS jsonb
  LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF page_key IN ('deanships/student-affairs', 'deanships/libraries')
    AND jsonb_typeof(c->'deanMessage') = 'object' AND NOT c->'deanMessage' ? 'name' THEN
    c := jsonb_set(c, '{deanMessage}', c->'deanMessage' || jsonb_build_object(
      'name', jsonb_build_object('ar', '', 'en', ''),
      'position', jsonb_build_object('ar', '', 'en', ''),
      'image', ''
    ));
  END IF;

  RETURN c;
END
$$;

BEGIN;

UPDATE "site_pages" SET "content" = pg_temp.reshape("key", "content")
  WHERE pg_temp.reshape("key", "content") <> "content";

UPDATE "site_page_revisions" r SET "content" = pg_temp.reshape(p."key", r."content")
  FROM "site_pages" p
  WHERE r."page_id" = p."id" AND pg_temp.reshape(p."key", r."content") <> r."content";

COMMIT;
