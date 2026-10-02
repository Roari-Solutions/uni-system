import { f } from './fields';
import { validateContent } from './validate';

const schema = f.group(['ص', 'Page'], {
  title: f.text(['ع', 'Title']),
  note: f.text(['م', 'Note'], { optional: true }),
  email: f.string(['ب', 'Email'], { format: 'email' }),
  photo: f.image(['ص', 'Photo'], { optional: true }),
  years: f.number(['س', 'Years'], { integer: true, optional: true }),
  plus: f.boolean(['+', 'Plus']),
  kind: f.choice(
    ['ن', 'Kind'],
    [
      ['a', 'أ', 'A'],
      ['b', 'ب', 'B'],
    ],
  ),
  cards: f.list(['ب', 'Cards'], ['ب', 'Card'], f.text(['ن', 'Text']), {
    length: 2,
  }),
  items: f.list(['ع', 'Items'], ['ع', 'Item'], f.text(['ن', 'Text']), {
    min: 1,
    max: 2,
  }),
});

const valid = () => ({
  title: { ar: 'عنوان', en: '' },
  note: { ar: '', en: '' },
  email: 'info@ut.edu.sd',
  photo: '/images/abc.jpg',
  years: null,
  plus: false,
  kind: 'a',
  cards: [
    { ar: 'أ', en: 'A' },
    { ar: 'ب', en: '' },
  ],
  items: [{ ar: '', en: 'Only English' }],
});

const codes = (content: unknown) =>
  validateContent(schema, content).map((i) => `${i.path}:${i.code}`);

describe('validateContent', () => {
  it('accepts content that fits exactly', () => {
    expect(codes(valid())).toEqual([]);
  });

  it('refuses a field the page does not have', () => {
    expect(codes({ ...valid(), extraSection: { ar: 'x', en: '' } })).toEqual([
      'extraSection:UNKNOWN_FIELD',
    ]);
  });

  it('refuses a missing field, even an optional one', () => {
    const { note: _note, ...rest } = valid();
    expect(codes(rest)).toEqual(['note:MISSING_FIELD']);
  });

  it('refuses a resized fixed list but allows a repeatable one within bounds', () => {
    const content = valid();
    content.cards.push({ ar: 'ج', en: '' });
    content.items.push({ ar: 'ثاني', en: '' });
    expect(codes(content)).toEqual(['cards:LIST_LENGTH']);
  });

  it('refuses a repeatable list past its bounds', () => {
    expect(codes({ ...valid(), items: [] })).toEqual(['items:LIST_LENGTH']);
  });

  it('needs both language keys and at least one filled language', () => {
    expect(codes({ ...valid(), title: 'plain string' })).toEqual([
      'title:NOT_LOCALIZED',
    ]);
    expect(codes({ ...valid(), title: { ar: 'x' } })).toEqual([
      'title:NOT_LOCALIZED',
    ]);
    expect(codes({ ...valid(), title: { ar: ' ', en: '' } })).toEqual([
      'title:EMPTY',
    ]);
  });

  it('checks formats, media urls, numbers, switches and choices', () => {
    expect(
      codes({
        ...valid(),
        email: 'nope',
        photo: 'javascript:alert(1)',
        years: 2.5,
        plus: 'yes',
        kind: 'c',
      }),
    ).toEqual([
      'email:BAD_FORMAT',
      'photo:BAD_FORMAT',
      'years:NOT_A_NUMBER',
      'plus:NOT_A_BOOLEAN',
      'kind:BAD_CHOICE',
    ]);
  });

  it('refuses a top level that is not an object', () => {
    expect(codes(['not', 'a', 'page'])).toEqual([':NOT_AN_OBJECT']);
  });
});
