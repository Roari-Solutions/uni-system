import { f, type PageSchema } from '../schema/fields';
import { icon } from './icons';
import { formerHolders } from './leader';
import { contactRef } from './site';

const node = (ar: string, en: string) =>
  f.group([ar, en], { name: f.text(['الاسم', 'Name']), icon: icon() });

/**
 * The scientific affairs secretariat: a hero, a figures strip, and five tabs
 * picked from the side menu. The tabs' order is fixed; their names are content.
 */
export const scientificAffairsSchema: PageSchema = f.group(
  ['أمانة الشؤون العلمية', 'Scientific affairs'],
  {
    hero: f.group(['الواجهة', 'Hero'], {
      title: f.text(['العنوان', 'Title']),
      content: f.para(['النص', 'Text']),
      tasksButton: f.text(['نص زر المهام', 'Responsibilities button text']),
      regulationsButton: f.text(['نص زر اللوائح', 'Regulations button text']),
    }),
    stats: f.list(
      ['الأرقام', 'Figures'],
      ['رقم', 'Figure'],
      f.group(['رقم', 'Figure'], {
        value: f.string(['القيمة', 'Value']),
        label: f.text(['الوصف', 'Label']),
      }),
      { length: 4 },
    ),
    sidebar: f.group(['القائمة الجانبية', 'Side menu'], {
      title: f.text(['العنوان', 'Heading']),
      tabs: f.list(
        ['أسماء الأقسام', 'Tab names'],
        ['قسم', 'Tab'],
        f.text(['الاسم', 'Name']),
        {
          length: 5,
          help: [
            'بالترتيب: النبذة، الرؤية، الهياكل، المهام، اللوائح',
            'In order: about, vision, structure, responsibilities, regulations',
          ],
        },
      ),
      contactTitle: f.text(['عنوان صندوق التواصل', 'Contact box heading']),
      contactDescription: f.para(['وصف صندوق التواصل', 'Contact box text']),
      contact: contactRef(),
      phoneLabel: f.text(['عنوان الهاتف', 'Phone label']),
      emailLabel: f.text(['عنوان البريد', 'Email label']),
      hoursLabel: f.text(['عنوان مواعيد العمل', 'Working hours label']),
      hours: f.text(['مواعيد العمل', 'Working hours']),
    }),
    overview: f.group(['نبذة عن الأمانة', 'About the secretariat'], {
      title: f.text(['العنوان', 'Heading']),
      text: f.para(['النص', 'Text']),
    }),
    vision: f.group(['الرؤية والرسالة والأهداف', 'Vision, mission and goals'], {
      title: f.text(['العنوان', 'Heading']),
      cards: f.list(
        ['البطاقات', 'Cards'],
        ['بطاقة', 'Card'],
        f.group(['بطاقة', 'Card'], {
          title: f.text(['العنوان', 'Title']),
          icon: icon(),
          items: f.list(
            ['البنود', 'Points'],
            ['بند', 'Point'],
            f.para(['البند', 'Point']),
            { min: 1, max: 12 },
          ),
        }),
        { min: 1, max: 6 },
      ),
    }),
    structure: f.group(['الهياكل الإدارية', 'Administrative structure'], {
      title: f.text(['العنوان', 'Heading']),
      secretary: node('الأمين', 'Secretary'),
      deputy: node('النائب', 'Deputy'),
      units: f.list(
        ['الإدارات والأقسام', 'Units'],
        ['وحدة', 'Unit'],
        node('وحدة', 'Unit'),
        { max: 12 },
      ),
    }),
    tasks: f.group(['المهام', 'Responsibilities'], {
      title: f.text(['العنوان', 'Heading']),
      items: f.list(
        ['المهام', 'Responsibilities'],
        ['مهمة', 'Responsibility'],
        f.group(['مهمة', 'Responsibility'], {
          title: f.text(['العنوان', 'Title']),
          content: f.para(['الوصف', 'Description']),
        }),
        { min: 1, max: 30 },
      ),
    }),
    resources: f.group(['اللوائح والسياسات', 'Regulations and policies'], {
      title: f.text(['العنوان', 'Heading']),
      items: f.list(
        ['الملفات', 'Files'],
        ['ملف', 'File'],
        f.group(['ملف', 'File'], {
          title: f.text(['العنوان', 'Title']),
          file: f.file(['الملف (PDF)', 'File (PDF)'], { optional: true }),
          metadata: f.string(['وصف الملف', 'File details'], {
            help: ['مثل: PDF, 2MB', 'For example: PDF, 2MB'],
          }),
        }),
        { max: 30 },
      ),
    }),
    formerHolders,
  },
);
