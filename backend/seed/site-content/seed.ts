/**
 * Loads the website content snapshot into site_pages. The snapshot is the
 * content the website showed before the CMS existed (pages/*.json, images/*).
 *
 *   bun seed/site-content/seed.ts             adds the pages that have no content yet
 *   bun seed/site-content/seed.ts --overwrite  also replaces pages that do, as a new version
 *
 * Every page is checked against its schema first; if one fails nothing is
 * written. Images are copied into MEDIA_DIR/images under their content hash,
 * the same names uploads get.
 */
import 'dotenv/config';
import { copyFile, mkdir, readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../schema';
import { config } from '../../config';
import { PAGES, schemaOf } from '../../src/site-content/pages';
import { validateContent } from '../../src/site-content/schema/validate';

const HERE = __dirname;
const MEDIA_DIR = process.env.MEDIA_DIR ?? '/data/';
const overwrite = process.argv.includes('--overwrite');

async function main() {
  const contents = new Map<string, unknown>();
  let invalid = 0;
  for (const page of PAGES) {
    const content: unknown = JSON.parse(
      await readFile(join(HERE, 'pages', `${page.key}.json`), 'utf8'),
    );
    const issues = validateContent(schemaOf(page), content);
    if (issues.length) {
      invalid++;
      console.error(
        `${page.key}: ${issues.map((i) => `${i.path} ${i.code}`).join(', ')}`,
      );
    }
    contents.set(page.key, content);
  }
  if (invalid)
    throw new Error(
      `${invalid} page(s) do not fit their schema; nothing was written`,
    );

  const imagesDir = join(MEDIA_DIR, 'images');
  await mkdir(imagesDir, { recursive: true });
  let copied = 0;
  for (const name of await readdir(join(HERE, 'images'))) {
    const target = join(imagesDir, name);
    if (await stat(target).catch(() => null)) continue;
    await copyFile(join(HERE, 'images', name), target);
    copied++;
  }
  console.log(`images: ${copied} copied to ${imagesDir}`);

  const pool = new Pool({ connectionString: config.databaseUrl });
  const db = drizzle(pool, { schema });
  let added = 0;
  let replaced = 0;
  try {
    for (const page of PAGES) {
      const content = contents.get(page.key);
      await db.transaction(async (tx) => {
        const row = await tx.query.sitePages.findFirst({
          where: eq(schema.sitePages.key, page.key),
        });
        if (!row) {
          const [created] = await tx
            .insert(schema.sitePages)
            .values({
              key: page.key,
              template: page.template,
              content,
              version: 1,
            })
            .returning({ id: schema.sitePages.id });
          await tx
            .insert(schema.sitePageRevisions)
            .values({ pageId: created.id, version: 1, content });
          added++;
        } else if (overwrite) {
          const version = row.version + 1;
          await tx
            .update(schema.sitePages)
            .set({ content, version, updatedBy: null })
            .where(eq(schema.sitePages.id, row.id));
          await tx
            .insert(schema.sitePageRevisions)
            .values({ pageId: row.id, version, content });
          replaced++;
        }
      });
    }
  } finally {
    await pool.end();
  }
  console.log(
    `pages: ${added} added, ${replaced} replaced, ${PAGES.length - added - replaced} left as they were`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
