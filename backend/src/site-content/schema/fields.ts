/**
 * The vocabulary page schemas are written in. A schema fixes a page's structure
 * (its sections, fields and which lists may grow); content managers only fill
 * in values, and a save that changes the structure is refused.
 */

/** Text in both website languages. Either half may be empty; the site falls back to the other. */
export interface Localized {
  ar: string;
  en: string;
}

/** A label shown to content managers, in both dashboard languages. */
export type Label = Localized;

interface Base {
  label: Label;
  /** Hint under the field in the editor. */
  help?: Label;
}

/** Localized text. Unless optional, at least one language must be filled. */
export interface TextField extends Base {
  type: 'text';
  multiline?: boolean;
  optional?: boolean;
}

/**
 * Single-language text that reads the same in both languages: emails, phones,
 * links, dates. A `map` link is saved as a Google Maps embed link; a share or
 * place link is converted on save (see map-links.ts).
 */
export interface StringField extends Base {
  type: 'string';
  format?: 'plain' | 'email' | 'phone' | 'url' | 'date' | 'map';
  optional?: boolean;
}

export interface NumberField extends Base {
  type: 'number';
  integer?: boolean;
  optional?: boolean;
}

/** A yes/no switch, for things the design shows or hides (a "+" after a figure). */
export interface BooleanField extends Base {
  type: 'boolean';
}

/** A stored image's URL, as the media upload returns it. */
export interface ImageField extends Base {
  type: 'image';
  optional?: boolean;
}

/** A stored PDF's URL, as the media upload returns it. */
export interface FileField extends Base {
  type: 'file';
  optional?: boolean;
}

/** One of a fixed set of values the website knows how to render (a layout variant, an icon). */
export interface ChoiceField extends Base {
  type: 'choice';
  options: readonly { value: string; label: Label }[];
}

export interface GroupField extends Base {
  type: 'group';
  fields: Readonly<Record<string, Field>>;
}

/**
 * A list of like items. `length` pins it (a designed set of cards); otherwise
 * editors may add and remove items between `min` and `max`.
 */
export interface ListField extends Base {
  type: 'list';
  item: Field;
  /** What one item is called in the editor ("Slide", "Card"). */
  itemLabel: Label;
  length?: number;
  min?: number;
  max?: number;
}

export type Field =
  | TextField
  | StringField
  | NumberField
  | BooleanField
  | ImageField
  | FileField
  | ChoiceField
  | GroupField
  | ListField;

/** A page's whole schema: always a group at the top. */
export type PageSchema = GroupField;

type L = readonly [ar: string, en: string];

const label = ([ar, en]: L): Label => ({ ar, en });

/** Builder options: the field's own settings, with the help hint as an [ar, en] pair. */
type Opts<F> = Omit<
  F,
  'type' | 'label' | 'help' | 'item' | 'itemLabel' | 'fields' | 'options'
> & {
  help?: L;
};

/** Turns builder options into a field: the hint becomes a label, the rest passes through. */
function field<F extends Field>(
  type: F['type'],
  l: L,
  opts: { help?: L },
  extra: object = {},
): F {
  const { help, ...rest } = opts;
  return {
    type,
    label: label(l),
    ...extra,
    ...rest,
    ...(help ? { help: label(help) } : {}),
  } as F;
}

/** Builders that keep the template files short. */
export const f = {
  text: (l: L, opts: Opts<TextField> = {}) => field<TextField>('text', l, opts),
  para: (l: L, opts: Opts<TextField> = {}) =>
    field<TextField>('text', l, opts, { multiline: true }),
  string: (l: L, opts: Opts<StringField> = {}) =>
    field<StringField>('string', l, opts),
  number: (l: L, opts: Opts<NumberField> = {}) =>
    field<NumberField>('number', l, opts),
  boolean: (l: L, opts: Opts<BooleanField> = {}) =>
    field<BooleanField>('boolean', l, opts),
  image: (l: L, opts: Opts<ImageField> = {}) =>
    field<ImageField>('image', l, opts),
  file: (l: L, opts: Opts<FileField> = {}) => field<FileField>('file', l, opts),
  choice: (
    l: L,
    options: readonly (readonly [value: string, ar: string, en: string])[],
  ) =>
    field<ChoiceField>(
      'choice',
      l,
      {},
      {
        options: options.map(([value, ar, en]) => ({
          value,
          label: { ar, en },
        })),
      },
    ),
  group: (l: L, fields: Record<string, Field>) =>
    field<GroupField>('group', l, {}, { fields }),
  list: (l: L, itemLabel: L, item: Field, opts: Opts<ListField> = {}) =>
    field<ListField>('list', l, opts, { itemLabel: label(itemLabel), item }),
};
