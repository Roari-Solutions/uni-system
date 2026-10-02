import { f, type PageSchema } from '../schema/fields';

const photo = (extra = {}) => ({
  category: f.text(['التصنيف', 'Category'], {
    help: [
      'تظهر التصنيفات كأزرار تصفية أعلى المعرض',
      'Categories become the filter buttons above the gallery',
    ],
  }),
  image: f.image(['الصورة', 'Image']),
  title: f.text(['العنوان', 'Title']),
  description: f.para(['الوصف', 'Description']),
  ...extra,
});

const located = {
  location: f.text(['المكان', 'Location'], { optional: true }),
  date: f.string(['التاريخ', 'Date'], { format: 'date', optional: true }),
  credit: f.text(['المصدر', 'Credit'], { optional: true }),
};

/**
 * The gallery's layout is fixed: one featured photo across the top, two
 * highlighted photos under it, then a grid of the rest.
 */
export const gallerySchema: PageSchema = f.group(
  ['معرض الصور', 'Photo gallery'],
  {
    header: f.group(['الترويسة', 'Header'], {
      title: f.text(['العنوان', 'Title']),
      description: f.para(['الوصف', 'Description']),
      countValue: f.string(['عدد الصور', 'Photo count']),
      countLabel: f.text(['وصف العدد', 'Count label']),
    }),
    allLabel: f.text(['نص زر "الكل"', '"All" filter text']),
    featured: f.group(
      ['الصورة المميزة', 'Featured photo'],
      photo({ badge: f.text(['الشارة', 'Badge']) }),
    ),
    highlights: f.list(
      ['الصورتان البارزتان', 'Highlighted photos'],
      ['صورة', 'Photo'],
      f.group(['صورة', 'Photo'], photo(located)),
      {
        length: 2,
      },
    ),
    more: f.list(
      ['بقية الصور', 'More photos'],
      ['صورة', 'Photo'],
      f.group(['صورة', 'Photo'], photo(located)),
      {
        max: 60,
      },
    ),
  },
);
