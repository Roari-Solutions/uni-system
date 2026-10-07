import type { Field, PageSchema } from './fields';
import { MAP_EMBED } from './validate';

/** Google's short share links, which redirect to the full place link. */
const SHORT_LINK = /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\//;

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 8000;

/** A map centred on the point, with Google's pin on it. */
export const embedAt = (lat: string, lng: string) =>
  `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;

const NUMBER = String.raw`-?\d{1,3}(?:\.\d+)?`;

/**
 * The pinned point in a Google Maps link: the place's own pin (`!3d…!4d…`)
 * first, then a `q=`/`ll=` point, then the centre of the view (`@lat,lng`).
 */
export const coordinatesIn = (link: string): [string, string] | null => {
  const text = decodeURIComponent(link);
  const pin = text.match(new RegExp(`!3d(${NUMBER})!4d(${NUMBER})`));
  if (pin) return [pin[1], pin[2]];
  const query = text.match(
    new RegExp(`[?&](?:q|ll)=(${NUMBER}),\\s*(${NUMBER})`),
  );
  if (query) return [query[1], query[2]];
  const view = text.match(new RegExp(`@(${NUMBER}),(${NUMBER})`));
  if (view) return [view[1], view[2]];
  return null;
};

/** Follows a short share link to the full place link it stands for. */
const resolveShortLink = async (link: string): Promise<string> => {
  let current = link;
  for (let hop = 0; hop < MAX_REDIRECTS && SHORT_LINK.test(current); hop++) {
    const res = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const next = res.headers.get('location');
    if (!next) break;
    current = new URL(next, current).toString();
  }
  return current;
};

/**
 * A Google Maps link as an embed link with the pin, or the link unchanged
 * when it already is one or no location can be read from it (the save is
 * then refused with BAD_MAP_LINK).
 */
export async function toMapEmbed(link: string): Promise<string> {
  const value = link.trim();
  if (!value || MAP_EMBED.test(value)) return value;
  try {
    const full = SHORT_LINK.test(value) ? await resolveShortLink(value) : value;
    const point = coordinatesIn(full);
    return point ? embedAt(...point) : value;
  } catch {
    // Google unreachable or the link is broken: leave it for validation to refuse
    return value;
  }
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

async function walk(field: Field, value: unknown): Promise<unknown> {
  if (field.type === 'string' && field.format === 'map')
    return typeof value === 'string' ? await toMapEmbed(value) : value;
  if (field.type === 'group' && isObject(value)) {
    const out: Record<string, unknown> = { ...value };
    for (const [key, child] of Object.entries(field.fields))
      if (key in out) out[key] = await walk(child, out[key]);
    return out;
  }
  if (field.type === 'list' && Array.isArray(value))
    return await Promise.all(value.map((item) => walk(field.item, item)));
  return value;
}

/** The content with every map link turned into an embed link, ready to validate and save. */
export const normalizeMapLinks = (
  schema: PageSchema,
  content: unknown,
): Promise<unknown> => walk(schema, content);
