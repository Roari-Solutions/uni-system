-- Brings saved website content to the college template that lets each member of
-- the college administration have a photo, in the pages and in their saved versions:
--   * every college's administration gains the dean's, vice dean's and
--     registrar's photos, left empty (the website shows an icon until one is
--     uploaded).
-- Safe to run twice: content already in the new shape is left as it is.
-- Run with psql (the helper lives in pg_temp, for this session only).

CREATE FUNCTION pg_temp.reshape(page_key text, c jsonb) RETURNS jsonb
  LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF page_key LIKE 'colleges/%'
    AND jsonb_typeof(c->'administration') = 'object' AND NOT c->'administration' ? 'deanImage' THEN
    c := jsonb_set(c, '{administration}', c->'administration' || jsonb_build_object(
      'deanImage', '',
      'viceDeanImage', '',
      'registrarImage', ''
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
