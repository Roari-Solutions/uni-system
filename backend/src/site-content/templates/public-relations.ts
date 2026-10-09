import { f, type PageSchema } from '../schema/fields';
import { contactRef } from './site';
import { bullets, departmentItem, formerHoldersTable } from './student-affairs';

const optionalText = (ar: string, en: string) =>
  f.text([ar, en], { optional: true });
const optionalPara = (ar: string, en: string) =>
  f.para([ar, en], { optional: true });

/**
 * The public relations and media administration's page, laid out like the
 * deanships. Every section is hidden on the website while it is empty.
 */
export const publicRelationsSchema: PageSchema = f.group(
  ['إدارة العلاقات العامة والإعلام', 'Public relations and media'],
  {
    hero: f.group(['الواجهة', 'Hero'], {
      title: f.text(['العنوان', 'Title']),
      subtitle: optionalPara('العنوان الفرعي', 'Subtitle'),
      image: f.image(['صورة الخلفية', 'Background image']),
    }),
    about: f.group(['عن الإدارة', 'About'], {
      title: f.text(['العنوان', 'Heading']),
      text: optionalPara('النص', 'Text'),
    }),
    managerMessage: f.group(['كلمة المدير', "Manager's message"], {
      title: f.text(['العنوان', 'Heading']),
      paragraphs: f.list(
        ['الفقرات', 'Paragraphs'],
        ['فقرة', 'Paragraph'],
        f.para(['الفقرة', 'Paragraph']),
        { max: 10 },
      ),
      name: optionalText('اسم المدير', "Manager's name"),
      position: optionalText('منصب المدير', "Manager's position"),
      image: f.image(['صورة المدير', "Manager's photo"], { optional: true }),
    }),
    visionMission: f.group(
      ['الرؤية والرسالة والقيم', 'Vision, mission and values'],
      {
        visionTitle: f.text(['عنوان الرؤية', 'Vision heading']),
        vision: optionalPara('الرؤية', 'Vision'),
        missionTitle: f.text(['عنوان الرسالة', 'Mission heading']),
        mission: optionalPara('الرسالة', 'Mission'),
        valuesTitle: f.text(['عنوان القيم', 'Values heading']),
        values: f.list(
          ['القيم', 'Values'],
          ['قيمة', 'Value'],
          f.text(['القيمة', 'Value']),
          { max: 10 },
        ),
      },
    ),
    goals: f.group(['الأهداف', 'Goals'], {
      title: f.text(['العنوان', 'Heading']),
      intro: optionalPara('المقدمة', 'Introduction'),
      items: bullets(12),
    }),
    departments: f.group(['أقسام الإدارة', 'Sections of the administration'], {
      title: f.text(['العنوان', 'Heading']),
      items: f.list(
        ['الأقسام', 'Sections'],
        ['قسم', 'Section'],
        departmentItem,
        { max: 10 },
      ),
    }),
    // stored as formerDeans like the deanships' table, but these are the administration's former managers
    formerDeans: formerHoldersTable(
      ['الإدارة السابقة', 'Former administration'],
      ['المدراء السابقون', 'Former managers'],
      ['مدير', 'Manager'],
    ),
    sidebar: f.group(['الفهرس الجانبي', 'Side index'], {
      title: f.text(['العنوان', 'Heading']),
      items: f.list(
        ['البنود', 'Entries'],
        ['بند', 'Entry'],
        f.text(['البند', 'Entry']),
        {
          length: 6,
          help: [
            'كل بند ينقل إلى القسم المقابل بالترتيب، ويُخفى مع قسمه',
            'Each entry jumps to the matching section, in order, and hides with it',
          ],
        },
      ),
    }),
    // the box under the side index; working hours are hidden while empty
    contact: f.group(['التواصل', 'Contact'], {
      title: f.text(['العنوان', 'Heading']),
      contact: contactRef(),
      hours: optionalText('أوقات العمل', 'Working hours'),
    }),
  },
);
