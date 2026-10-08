-- Brings saved website content to the former deans' table gaining a photo per
-- dean (student affairs, libraries, public relations and media), in the pages
-- and in their saved versions: each dean saved without one gets an empty photo.
-- Safe to run twice: deans that already have a photo field are left as they are.
-- Run with psql (the helper lives in pg_temp, for this session only).

CREATE FUNCTION pg_temp.reshape(page_key text, c jsonb) RETURNS jsonb
  LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF page_key IN (
    'deanships/student-affairs', 'deanships/libraries', 'about/public-relations-media'
  ) AND jsonb_typeof(c->'formerDeans'->'items') = 'array' THEN
    c := jsonb_set(c, '{formerDeans,items}', (
      SELECT COALESCE(jsonb_agg(
        CASE WHEN dean ? 'image' THEN dean ELSE dean || '{"image": ""}'::jsonb END
        ORDER BY i
      ), '[]'::jsonb)
      FROM jsonb_array_elements(c->'formerDeans'->'items') WITH ORDINALITY AS d(dean, i)
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
