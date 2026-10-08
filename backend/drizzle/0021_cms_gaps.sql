-- Brings saved website content to the templates that now let editors reach what
-- the website showed without a field for it, in the pages and in their saved versions:
--   * the partnerships invitation names which official contact gives its email
--     and phone (the website always used the partnerships entry);
--   * the centers' quote may have its author's photo (left empty: the letter in
--     the circle still shows until one is uploaded).
-- Safe to run twice: content already in the new shape is left as it is.
-- Run with psql (the helper lives in pg_temp, for this session only).

CREATE FUNCTION pg_temp.reshape(page_key text, c jsonb) RETURNS jsonb
  LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF page_key = 'about/partnerships'
    AND jsonb_typeof(c->'cta') = 'object' AND NOT c->'cta' ? 'contact' THEN
    c := jsonb_set(c, '{cta,contact}', '"partnerships"'::jsonb);
  END IF;

  IF page_key IN (
    'centers/information-technology', 'centers/media-center', 'centers/strategy-future-sciences'
  ) AND jsonb_typeof(c->'quote') = 'object' AND NOT c->'quote' ? 'authorImage' THEN
    c := jsonb_set(c, '{quote,authorImage}', '""'::jsonb);
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
