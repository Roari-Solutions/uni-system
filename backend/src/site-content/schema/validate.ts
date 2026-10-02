import type { Field, PageSchema } from './fields';

/** One problem with submitted content, located by its path (e.g. `hero.slides.2.title`). */
export interface ContentIssue {
  path: string;
  code:
    | 'NOT_AN_OBJECT'
    | 'NOT_A_LIST'
    | 'UNKNOWN_FIELD'
    | 'MISSING_FIELD'
    | 'NOT_LOCALIZED'
    | 'EMPTY'
    | 'NOT_A_STRING'
    | 'NOT_A_NUMBER'
    | 'NOT_A_BOOLEAN'
    | 'BAD_FORMAT'
    | 'BAD_CHOICE'
    | 'LIST_LENGTH'
    | 'TOO_LONG';
}

/** Longest single text value accepted; far above anything a page shows. */
export const MAX_TEXT_LENGTH = 20_000;

const FORMATS: Record<string, RegExp> = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$|^\[.*\]$/,
  // digits, spaces, + - ( ), or a [PLACEHOLDER] the site shows until the real value arrives
  phone: /^[+\d\s()-]{3,}$|^\[.*\]$/,
  // absolute links, site paths and in-page anchors
  url: /^(https?:\/\/\S+|\/\S*|#\S*|mailto:\S+|tel:\S+)$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
};

/** Stored media lives under /images or /pdfs; anything else must be an absolute URL. */
const MEDIA_URL = /^(\/(images|pdfs)\/[\w.-]+|https?:\/\/\S+)$/;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const join = (path: string, key: string | number) =>
  path ? `${path}.${key}` : String(key);

/** Optional single-value fields may be an empty string, never missing. */
const isOptional = (field: Field) =>
  'optional' in field && field.optional === true;

function checkString(
  value: unknown,
  path: string,
  issues: ContentIssue[],
): value is string {
  if (typeof value !== 'string') {
    issues.push({ path, code: 'NOT_A_STRING' });
    return false;
  }
  if (value.length > MAX_TEXT_LENGTH) {
    issues.push({ path, code: 'TOO_LONG' });
    return false;
  }
  return true;
}

function walk(
  field: Field,
  value: unknown,
  path: string,
  issues: ContentIssue[],
): void {
  switch (field.type) {
    case 'group': {
      if (!isObject(value)) {
        issues.push({ path, code: 'NOT_AN_OBJECT' });
        return;
      }
      for (const key of Object.keys(value)) {
        if (!(key in field.fields))
          issues.push({ path: join(path, key), code: 'UNKNOWN_FIELD' });
      }
      for (const [key, child] of Object.entries(field.fields)) {
        if (!(key in value)) {
          issues.push({ path: join(path, key), code: 'MISSING_FIELD' });
          continue;
        }
        walk(child, value[key], join(path, key), issues);
      }
      return;
    }

    case 'list': {
      if (!Array.isArray(value)) {
        issues.push({ path, code: 'NOT_A_LIST' });
        return;
      }
      const { length, min = 0, max } = field;
      const wrongLength =
        length !== undefined
          ? value.length !== length
          : value.length < min || (max !== undefined && value.length > max);
      if (wrongLength) issues.push({ path, code: 'LIST_LENGTH' });
      value.forEach((item, i) => walk(field.item, item, join(path, i), issues));
      return;
    }

    case 'text': {
      if (
        !isObject(value) ||
        Object.keys(value).length !== 2 ||
        !('ar' in value) ||
        !('en' in value)
      ) {
        issues.push({ path, code: 'NOT_LOCALIZED' });
        return;
      }
      const { ar, en } = value;
      const arOk = checkString(ar, join(path, 'ar'), issues);
      const enOk = checkString(en, join(path, 'en'), issues);
      if (arOk && enOk && !field.optional && !ar.trim() && !en.trim()) {
        issues.push({ path, code: 'EMPTY' });
      }
      return;
    }

    case 'string': {
      if (!checkString(value, path, issues)) return;
      if (!value.trim()) {
        if (!field.optional) issues.push({ path, code: 'EMPTY' });
        return;
      }
      const format = field.format && FORMATS[field.format];
      if (format && !format.test(value.trim()))
        issues.push({ path, code: 'BAD_FORMAT' });
      return;
    }

    case 'image':
    case 'file': {
      if (!checkString(value, path, issues)) return;
      if (!value) {
        if (!field.optional) issues.push({ path, code: 'EMPTY' });
        return;
      }
      if (!MEDIA_URL.test(value)) issues.push({ path, code: 'BAD_FORMAT' });
      return;
    }

    case 'number': {
      // an optional number is null when left blank
      if (value === null && isOptional(field)) return;
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        issues.push({ path, code: 'NOT_A_NUMBER' });
        return;
      }
      if (field.integer && !Number.isInteger(value))
        issues.push({ path, code: 'NOT_A_NUMBER' });
      return;
    }

    case 'boolean': {
      if (typeof value !== 'boolean')
        issues.push({ path, code: 'NOT_A_BOOLEAN' });
      return;
    }

    case 'choice': {
      if (!field.options.some((o) => o.value === value))
        issues.push({ path, code: 'BAD_CHOICE' });
      return;
    }
  }
}

/** Every way the content departs from the page's schema; empty when it fits exactly. */
export function validateContent(
  schema: PageSchema,
  content: unknown,
): ContentIssue[] {
  const issues: ContentIssue[] = [];
  walk(schema, content, '', issues);
  return issues;
}
