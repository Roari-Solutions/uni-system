-- Brings saved website content to the templates that give the public relations
-- and media administration a contact box, in the pages and in their saved versions:
--   * the official contacts gain a public relations entry, with the phone and
--     email left as placeholders until the university supplies them;
--   * the public relations page gains a contact box pointing at that entry
--     (its working hours left empty, which hides them on the website).
-- Safe to run twice: content already in the new shape is left as it is.
-- Run with psql (the helper lives in pg_temp, for this session only).

CREATE FUNCTION pg_temp.reshape(page_key text, c jsonb) RETURNS jsonb
  LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF page_key = 'site/contacts' AND NOT c ? 'publicRelations' THEN
    c := c || jsonb_build_object('publicRelations', jsonb_build_object(
      'label', jsonb_build_object('ar', 'إدارة العلاقات العامة والإعلام', 'en', ''),
      'phone', '[PHONE NUMBER]',
      'ext', '',
      'email', '[EMAIL ADDRESS]'
    ));
  END IF;

  IF page_key = 'about/public-relations-media' AND NOT c ? 'contact' THEN
    c := c || jsonb_build_object('contact', jsonb_build_object(
      'title', jsonb_build_object('ar', 'تواصل معنا', 'en', ''),
      'contact', 'publicRelations',
      'hours', jsonb_build_object('ar', '', 'en', '')
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
