import { f, type PageSchema } from '../schema/fields';
import { contactRef } from './site';

/** A center's page: the IT, media and strategy centers. */
export const unitSchema: PageSchema = f.group(
  ['صفحة مركز أو عمادة', 'Center or deanship page'],
  {
    hero: f.group(['الواجهة', 'Hero'], {
      breadcrumb: f.text(['مسار التصفح', 'Breadcrumb'], { optional: true }),
      title: f.text(['العنوان', 'Title'], {
        multiline: true,
        help: [
          'كل سطر جديد يظهر في سطر مستقل',
          'Each new line shows on its own line',
        ],
      }),
      subtitle: f.para(['العنوان الفرعي', 'Subtitle']),
      image: f.image(['صورة الخلفية', 'Background image']),
      buttonLabel: f.text(['نص زر الدليل', 'Guide button text']),
      guide: f.file(['الدليل التعريفي (PDF)', 'Guide (PDF)'], {
        optional: true,
      }),
    }),
    about: f.group(['نبذة', 'About'], {
      eyebrow: f.text(['العنوان الصغير', 'Eyebrow']),
      title: f.text(['العنوان', 'Heading']),
      text: f.para(['النص', 'Text']),
    }),
    quote: f.group(['الاقتباس', 'Quote'], {
      text: f.para(['الاقتباس', 'Quote']),
      authorName: f.text(['اسم القائل', 'Author name']),
      authorPosition: f.text(['منصب القائل', 'Author position']),
      authorImage: f.image(['صورة القائل', "Author's photo"], { optional: true }),
      authorInitial: f.text(['الحرف في الدائرة (بدون صورة)', 'Letter in the circle (without a photo)']),
    }),
    highlights: f.list(
      ['المحاور', 'Focus areas'],
      ['محور', 'Focus area'],
      f.group(['محور', 'Focus area'], {
        title: f.text(['العنوان', 'Title']),
        description: f.text(['الوصف', 'Description']),
      }),
      { length: 4 },
    ),
    quality: f.group(['الجودة والتميز', 'Quality'], {
      title: f.text(['العنوان', 'Heading']),
      tags: f.list(
        ['الوسوم', 'Tags'],
        ['وسم', 'Tag'],
        f.text(['الوسم', 'Tag']),
        { min: 1, max: 6 },
      ),
    }),
    feature: f.group(['البطاقة البارزة', 'Highlighted card'], {
      title: f.text(['العنوان', 'Title']),
      text: f.text(['النص', 'Text']),
    }),
    services: f.group(['الخدمات', 'Services'], {
      eyebrow: f.text(['العنوان الصغير', 'Eyebrow']),
      title: f.text(['العنوان', 'Heading']),
      description: f.para(['الوصف', 'Description']),
      items: f.list(
        ['الخدمات', 'Services'],
        ['خدمة', 'Service'],
        f.text(['الخدمة', 'Service']),
        { min: 1, max: 8 },
      ),
    }),
    sidebar: f.group(['الفهرس الجانبي', 'Side index'], {
      title: f.text(['العنوان', 'Heading']),
      items: f.list(
        ['البنود', 'Entries'],
        ['بند', 'Entry'],
        f.text(['البند', 'Entry']),
        { length: 5 },
      ),
    }),
    contact: f.group(['التواصل', 'Contact'], {
      title: f.text(['العنوان', 'Heading']),
      contact: contactRef(),
      hours: f.text(['أوقات العمل', 'Working hours']),
    }),
  },
);
