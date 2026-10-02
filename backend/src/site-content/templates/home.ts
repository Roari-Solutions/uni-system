import { f, type PageSchema } from '../schema/fields';

export const homeSchema: PageSchema = f.group(
  ['الصفحة الرئيسية', 'Home page'],
  {
    hero: f.group(['الواجهة الرئيسية', 'Hero'], {
      slides: f.list(
        ['الشرائح', 'Slides'],
        ['شريحة', 'Slide'],
        f.group(['شريحة', 'Slide'], {
          title: f.text(['العنوان', 'Title']),
          highlight: f.text([
            'الجزء المميز من العنوان',
            'Highlighted part of the title',
          ]),
          description: f.para(['الوصف', 'Description']),
          image: f.image(['صورة الخلفية', 'Background image']),
        }),
        { min: 1, max: 6 },
      ),
    }),
    presidentMessage: f.group(['كلمة مدير الجامعة', "President's message"], {
      photo: f.image(['الصورة', 'Photo']),
      name: f.text(['الاسم', 'Name']),
      position: f.text(['المنصب', 'Position']),
      eyebrow: f.text(['العنوان الصغير', 'Eyebrow']),
      heading: f.text(['العنوان', 'Heading']),
      paragraphs: f.list(
        ['الفقرات', 'Paragraphs'],
        ['فقرة', 'Paragraph'],
        f.para(['الفقرة', 'Paragraph']),
        {
          min: 1,
          max: 4,
        },
      ),
      readMoreLabel: f.text(['نص رابط المزيد', '"Read more" link text']),
      readMoreHref: f.string(['رابط المزيد', '"Read more" link'], {
        format: 'url',
      }),
    }),
    vision: f.group(['الرؤية والتوجهات', 'Vision and directions'], {
      heading: f.text(['العنوان', 'Heading']),
      subheading: f.text(['العنوان الفرعي', 'Subheading']),
      cards: f.list(
        ['البطاقات', 'Cards'],
        ['بطاقة', 'Card'],
        f.group(['بطاقة', 'Card'], {
          title: f.text(['العنوان', 'Title']),
          description: f.para(['الوصف', 'Description']),
        }),
        { length: 4 },
      ),
    }),
    news: f.group(['آخر الأخبار', 'Latest news'], {
      heading: f.text(['العنوان', 'Heading']),
      subheading: f.text(['العنوان الفرعي', 'Subheading']),
      readMoreLabel: f.text(['نص رابط المزيد', '"Read more" link text']),
      items: f.list(
        ['الأخبار', 'News items'],
        ['خبر', 'News item'],
        f.group(['خبر', 'News item'], {
          date: f.string(['التاريخ', 'Date'], { format: 'date' }),
          category: f.text(['التصنيف', 'Category']),
          title: f.text(['العنوان', 'Title']),
          description: f.para(['الوصف', 'Description']),
          image: f.image(['الصورة', 'Image']),
          href: f.string(['رابط الخبر', 'Link'], {
            format: 'url',
            optional: true,
          }),
        }),
        { min: 1, max: 6 },
      ),
    }),
    stats: f.group(['الجامعة بالأرقام', 'University in numbers'], {
      eyebrow: f.text(['العنوان الصغير', 'Eyebrow']),
      heading: f.text(['العنوان', 'Heading']),
      headingHighlight: f.text([
        'الجزء المميز من العنوان',
        'Highlighted part of the heading',
      ]),
      description: f.para(['الوصف', 'Description']),
      buttonLabel: f.text(['نص الزر', 'Button text']),
      items: f.list(
        ['الأرقام', 'Figures'],
        ['رقم', 'Figure'],
        f.group(['رقم', 'Figure'], {
          value: f.string(['القيمة', 'Value']),
          title: f.text(['العنوان', 'Title']),
          description: f.text(['الوصف', 'Description']),
        }),
        { length: 4 },
      ),
    }),
  },
);
