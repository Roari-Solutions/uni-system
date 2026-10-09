import { f, type PageSchema } from '../schema/fields';
import { contactRef } from './site';
import {
  bullets,
  deanSignature,
  departmentItem,
  formerDeans,
} from './student-affairs';
import { unitSchema } from './unit';

const optionalText = (ar: string, en: string) =>
  f.text([ar, en], { optional: true });
const optionalPara = (ar: string, en: string) =>
  f.para([ar, en], { optional: true });

/**
 * The libraries deanship's page: the student affairs layout with the
 * libraries' own hero, side index and contact box. Every section after
 * "about" is hidden on the website while it is empty.
 */
export const librarySchema: PageSchema = f.group(
  ['عمادة المكتبات', 'Libraries deanship'],
  {
    hero: unitSchema.fields.hero,
    about: f.group(['نبذة عن المكتبة', 'About'], {
      title: f.text(['العنوان', 'Heading']),
      text: f.para(['النص', 'Text']),
    }),
    visionMission: f.group(['الرؤية والرسالة', 'Vision and mission'], {
      visionTitle: f.text(['عنوان الرؤية', 'Vision heading']),
      vision: optionalPara('الرؤية', 'Vision'),
      missionTitle: f.text(['عنوان الرسالة', 'Mission heading']),
      mission: optionalPara('الرسالة', 'Mission'),
    }),
    goals: f.group(['الأهداف', 'Goals'], {
      title: f.text(['العنوان', 'Heading']),
      intro: optionalPara('المقدمة', 'Introduction'),
      items: bullets(12),
    }),
    deanMessage: f.group(['كلمة العميد', "Dean's message"], {
      title: f.text(['العنوان', 'Heading']),
      paragraphs: f.list(
        ['الفقرات', 'Paragraphs'],
        ['فقرة', 'Paragraph'],
        f.para(['الفقرة', 'Paragraph']),
        {
          max: 10,
          help: [
            'يُخفى القسم إذا لم تكن هناك فقرات',
            'The section is hidden while there are no paragraphs',
          ],
        },
      ),
      ...deanSignature,
    }),
    departments: f.group(['أقسام المكتبة', 'Sections of the library'], {
      title: f.text(['العنوان', 'Heading']),
      items: f.list(
        ['الأقسام', 'Sections'],
        ['قسم', 'Section'],
        departmentItem,
        {
          max: 10,
        },
      ),
    }),
    eLibrary: f.group(['المكتبة الإلكترونية', 'E-library'], {
      title: f.text(['العنوان', 'Heading']),
      text: optionalPara('الوصف', 'Description'),
      buttonLabel: optionalText('نص الزر', 'Button text'),
      link: f.string(['رابط المكتبة الإلكترونية', 'E-library link'], {
        format: 'url',
        optional: true,
        help: [
          'يظهر الزر عند إدخال الرابط',
          'The button shows once there is a link',
        ],
      }),
    }),
    askLibrarian: f.group(['اسأل أمين المكتبة', 'Ask the librarian'], {
      title: f.text(['العنوان', 'Heading']),
      text: optionalPara('الوصف', 'Description'),
      contact: contactRef({ optional: true }),
    }),
    formerDeans,
    sidebar: f.group(['الفهرس الجانبي', 'Side index'], {
      title: f.text(['العنوان', 'Heading']),
      items: f.list(
        ['البنود', 'Entries'],
        ['بند', 'Entry'],
        f.text(['البند', 'Entry']),
        {
          length: 8,
          help: [
            'كل بند ينقل إلى القسم المقابل بالترتيب، ويُخفى مع قسمه',
            'Each entry jumps to the matching section, in order, and hides with it',
          ],
        },
      ),
    }),
    contact: unitSchema.fields.contact,
  },
);
