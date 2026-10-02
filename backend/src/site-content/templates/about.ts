import { f, type PageSchema } from '../schema/fields';
import { icon } from './icons';

const card = (textLabel: readonly [string, string]) =>
  f.group(['بطاقة', 'Card'], {
    title: f.text(['العنوان', 'Title']),
    text: f.para(textLabel),
    icon: icon(),
  });

const section = (ar: string, en: string, max: number) =>
  f.group([ar, en], {
    title: f.text(['العنوان', 'Heading']),
    subtitle: f.para(['العنوان الفرعي', 'Subheading']),
    items: f.list(
      ['البطاقات', 'Cards'],
      ['بطاقة', 'Card'],
      card(['النص', 'Text']),
      { min: 1, max },
    ),
  });

export const aboutSchema: PageSchema = f.group(
  ['عن الجامعة', 'About the university'],
  {
    hero: f.group(['الواجهة', 'Hero'], {
      title: f.text(['العنوان', 'Title']),
      subtitle: f.text(['العنوان الفرعي', 'Subtitle']),
      backgroundImage: f.image(['صورة الخلفية', 'Background image']),
      stats: f.list(
        ['الأرقام', 'Figures'],
        ['رقم', 'Figure'],
        f.group(['رقم', 'Figure'], {
          number: f.string(['القيمة', 'Value']),
          label: f.text(['الوصف', 'Label']),
          icon: icon(),
        }),
        { length: 4 },
      ),
    }),
    overview: f.group(['النشأة', 'Origins'], {
      title: f.text(['العنوان', 'Heading']),
      paragraphs: f.list(
        ['الفقرات', 'Paragraphs'],
        ['فقرة', 'Paragraph'],
        f.para(['الفقرة', 'Paragraph']),
        {
          min: 1,
          max: 8,
        },
      ),
      image: f.image(['الصورة', 'Image']),
      imageCaption: f.text(['تعليق الصورة', 'Image caption']),
    }),
    visionMission: f.group(['الرؤية والرسالة', 'Vision and mission'], {
      tagline: f.text(['العنوان الصغير', 'Eyebrow']),
      title: f.text(['العنوان', 'Heading']),
      description: f.text(['الوصف', 'Description']),
      vision: f.group(['الرؤية', 'Vision'], {
        title: f.text(['العنوان', 'Title']),
        text: f.para(['النص', 'Text']),
      }),
      mission: f.group(['الرسالة', 'Mission'], {
        title: f.text(['العنوان', 'Title']),
        text: f.para(['النص', 'Text']),
      }),
    }),
    goals: section('الأهداف', 'Goals', 12),
    values: section('القيم', 'Values', 12),
    degrees: f.group(['البرامج الدراسية', 'Study programs'], {
      title: f.text(['العنوان', 'Heading']),
      subtitle: f.para(['العنوان الفرعي', 'Subheading']),
      browseLabel: f.text(['نص زر التصفح', 'Browse button text']),
      items: f.list(
        ['الدرجات', 'Degrees'],
        ['درجة', 'Degree'],
        card(['الوصف', 'Description']),
        {
          min: 1,
          max: 12,
        },
      ),
    }),
  },
);
