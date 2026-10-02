import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAGES, schemaOf } from './pages';
import { validateContent } from './schema/validate';

/** The snapshot of the website's content as it stood before the CMS, kept to seed the database. */
const SEED_DIR = join(__dirname, '..', '..', 'seed', 'site-content');

const load = (key: string): unknown =>
  JSON.parse(readFileSync(join(SEED_DIR, 'pages', `${key}.json`), 'utf8'));

/** Every /images/... value anywhere in the content. */
function imageUrls(
  value: unknown,
  found: Set<string> = new Set(),
): Set<string> {
  if (typeof value === 'string' && value.startsWith('/images/'))
    found.add(value);
  else if (Array.isArray(value)) value.forEach((v) => imageUrls(v, found));
  else if (value && typeof value === 'object')
    Object.values(value).forEach((v) => imageUrls(v, found));
  return found;
}

describe('website content snapshot', () => {
  it.each(PAGES.map((p) => [p.key, p] as const))(
    '%s fits its schema',
    (key, page) => {
      expect(validateContent(schemaOf(page), load(key))).toEqual([]);
    },
  );

  it('has a file for every page and no page without one', () => {
    const files = new Set<string>();
    const walk = (dir: string, prefix: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory())
          walk(join(dir, entry.name), `${prefix}${entry.name}/`);
        else files.add(`${prefix}${entry.name.replace(/\.json$/, '')}`);
      }
    };
    walk(join(SEED_DIR, 'pages'), '');
    expect([...files].sort()).toEqual(PAGES.map((p) => p.key).sort());
  });

  it('ships every image it uses, and only those', () => {
    const used = new Set<string>();
    for (const p of PAGES) imageUrls(load(p.key), used);
    const shipped = readdirSync(join(SEED_DIR, 'images')).map(
      (name) => `/images/${name}`,
    );
    for (const url of used) expect(existsSync(join(SEED_DIR, url))).toBe(true);
    expect(shipped.sort()).toEqual([...used].sort());
  });
});
