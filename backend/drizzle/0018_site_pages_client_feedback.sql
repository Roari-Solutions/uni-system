-- Brings saved website content to the templates changed for the client's page
-- feedback (October 2026), in the pages and in their saved versions, so a
-- restored old version still fits:
--   * every leader page gains an "about" section and a departments section;
--     the vice-chancellor's come with their headings and the four departments
--     the client named, the others empty (hidden on the website);
--   * the university director's page moves to the "director" template, which
--     adds an optional banner photo;
--   * student affairs loses its side index and gains a news section;
--   * libraries moves to the "library" template: its hero, about text, side
--     index code and title and contact box carry over; the quote, highlights,
--     quality tags, feature card and services go.
-- Safe to run twice: content already in the new shape is left as it is.
-- Run with psql (the helpers live in pg_temp, for this session only).

CREATE FUNCTION pg_temp.l(ar text) RETURNS jsonb
  LANGUAGE sql IMMUTABLE AS $$ SELECT jsonb_build_object('ar', ar, 'en', '') $$;

CREATE FUNCTION pg_temp.reshape(page_key text, c jsonb) RETURNS jsonb
  LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  department_names text[] := ARRAY[
    'الخدمات والمخازن',
    'إدارة الموارد البشرية',
    'الإدارة الهندسية',
    'إدارة الحرس الجامعي'
  ];
BEGIN
  IF page_key IN (
    'about/university-director', 'about/executive-office', 'about/vice-chancellor',
    'about/scientific-affairs-secretary', 'about/public-relations-media'
  ) AND NOT c ? 'about' THEN
    c := c || jsonb_build_object(
      'about', jsonb_build_object(
        'title', pg_temp.l(CASE WHEN page_key = 'about/vice-chancellor' THEN 'نبذة عن الوكالة' ELSE '' END),
        'text', pg_temp.l('')
      ),
      'departments', jsonb_build_object(
        'tag', pg_temp.l(''),
        'title', pg_temp.l(CASE WHEN page_key = 'about/vice-chancellor' THEN 'الإدارات التابعة للوكالة' ELSE '' END),
        'description', pg_temp.l(''),
        'items', CASE WHEN page_key = 'about/vice-chancellor' THEN (
          SELECT jsonb_agg(
            jsonb_build_object('title', pg_temp.l(name), 'description', pg_temp.l(''), 'points', '[]'::jsonb)
            ORDER BY n
          )
          FROM unnest(department_names) WITH ORDINALITY AS d(name, n)
        ) ELSE '[]'::jsonb END
      )
    );
  END IF;

  IF page_key = 'about/university-director' AND NOT c ? 'banner' THEN
    c := c || jsonb_build_object('banner', '');
  END IF;

  IF page_key = 'deanships/student-affairs' AND NOT c ? 'news' THEN
    c := (c - 'sidebar') || jsonb_build_object(
      'news', jsonb_build_object('title', pg_temp.l('أخبار العمادة'), 'items', '[]'::jsonb)
    );
  END IF;

  IF page_key = 'deanships/libraries' AND c ? 'quote' THEN
    c := jsonb_build_object(
      'hero', c->'hero',
      'about', jsonb_build_object('title', c->'about'->'title', 'text', c->'about'->'text'),
      'visionMission', jsonb_build_object(
        'visionTitle', pg_temp.l('الرؤية'),
        'vision', pg_temp.l(''),
        'missionTitle', pg_temp.l('الرسالة'),
        'mission', pg_temp.l('')
      ),
      'goals', jsonb_build_object('title', pg_temp.l('الأهداف'), 'intro', pg_temp.l(''), 'items', '[]'::jsonb),
      'deanMessage', jsonb_build_object('title', pg_temp.l('كلمة العميد'), 'paragraphs', '[]'::jsonb),
      'departments', jsonb_build_object('title', pg_temp.l('أقسام المكتبة'), 'items', '[]'::jsonb),
      'eLibrary', jsonb_build_object(
        'title', pg_temp.l('المكتبة الإلكترونية'),
        'text', pg_temp.l(''),
        'buttonLabel', pg_temp.l('الدخول إلى المكتبة الإلكترونية'),
        'link', ''
      ),
      'askLibrarian', jsonb_build_object(
        'title', pg_temp.l('اسأل أمين المكتبة'),
        'text', pg_temp.l(''),
        'contact', 'libraries'
      ),
      'formerDeans', jsonb_build_object(
        'title', pg_temp.l('العمداء السابقين'),
        'numberColumn', pg_temp.l('الرقم'),
        'nameColumn', pg_temp.l('الاسم'),
        'periodColumn', pg_temp.l('الفترة'),
        'items', '[]'::jsonb
      ),
      'sidebar', jsonb_build_object(
        'code', c->'sidebar'->'code',
        'title', c->'sidebar'->'title',
        'items', jsonb_build_array(
          pg_temp.l('نبذة عن المكتبة'),
          pg_temp.l('الرؤية والرسالة'),
          pg_temp.l('الأهداف'),
          pg_temp.l('كلمة العميد'),
          pg_temp.l('أقسام المكتبة'),
          pg_temp.l('المكتبة الإلكترونية'),
          pg_temp.l('اسأل أمين المكتبة'),
          pg_temp.l('العمداء السابقين')
        )
      ),
      'contact', c->'contact'
    );
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

UPDATE "site_pages" SET "template" = 'director'
  WHERE "key" = 'about/university-director' AND "template" <> 'director';
UPDATE "site_pages" SET "template" = 'library'
  WHERE "key" = 'deanships/libraries' AND "template" <> 'library';

COMMIT;
