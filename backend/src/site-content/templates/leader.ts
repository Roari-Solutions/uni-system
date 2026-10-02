import { f, type PageSchema } from '../schema/fields';
import { icon } from './icons';
import { contactRef } from './site';

const optionalText = (ar: string, en: string) =>
  f.text([ar, en], { optional: true });
const optionalPara = (ar: string, en: string) =>
  f.para([ar, en], { optional: true });

/**
 * A university leader's or office's page. Every section is hidden on the
 * website while its list is empty, so one template serves offices that have
 * a full page and ones that have a name and an email so far.
 */
export const leaderSchema: PageSchema = f.group(
  ['صفحة قيادي أو إدارة', 'Leader or office page'],
  {
    profile: f.group(['التعريف', 'Profile'], {
      name: f.text(['الاسم', 'Name']),
      position: optionalText('المنصب', 'Position'),
      description: optionalPara('النبذة', 'About'),
      image: f.image(['الصورة', 'Photo'], { optional: true }),
      badge: optionalText('الشارة على الصورة', 'Badge on the photo'),
      stats: f.list(
        ['الأرقام', 'Figures'],
        ['رقم', 'Figure'],
        f.group(['رقم', 'Figure'], {
          value: f.string(['القيمة', 'Value']),
          label: f.text(['الوصف', 'Label']),
        }),
        { max: 4 },
      ),
      primaryActionLabel: optionalText('نص الزر الرئيسي', 'Main button text'),
      secondaryActionLabel: optionalText(
        'نص الزر الثانوي',
        'Second button text',
      ),
    }),
    message: f.group(['الكلمة', 'Message'], {
      title: optionalText('العنوان', 'Heading'),
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
      authorName: optionalText('اسم الكاتب', 'Author name'),
      authorPosition: optionalText('منصب الكاتب', 'Author position'),
    }),
    pillars: f.group(['الركائز', 'Pillars'], {
      title: f.text(['العنوان', 'Heading']),
      items: f.list(
        ['الركائز', 'Pillars'],
        ['ركيزة', 'Pillar'],
        f.group(['ركيزة', 'Pillar'], {
          title: f.text(['النص', 'Text']),
          icon: icon(),
        }),
        { max: 8 },
      ),
    }),
    strategicPlan: f.group(['الخطة الاستراتيجية', 'Strategic plan'], {
      vision: optionalPara('الرؤية', 'Vision'),
      mission: optionalPara('الرسالة', 'Mission'),
      goals: f.list(
        ['الأهداف', 'Goals'],
        ['هدف', 'Goal'],
        f.para(['الهدف', 'Goal']),
        { max: 12 },
      ),
      values: f.list(
        ['القيم', 'Values'],
        ['قيمة', 'Value'],
        f.para(['القيمة', 'Value']),
        { max: 12 },
      ),
    }),
    tasks: f.group(['المهام', 'Responsibilities'], {
      tag: optionalText('العنوان الصغير', 'Eyebrow'),
      title: optionalText('العنوان', 'Heading'),
      description: optionalPara('الوصف', 'Description'),
      items: f.list(
        ['المهام', 'Responsibilities'],
        ['مهمة', 'Responsibility'],
        f.group(['مهمة', 'Responsibility'], {
          title: f.text(['العنوان', 'Title']),
          description: f.para(['الوصف', 'Description']),
          icon: icon(),
        }),
        { max: 12 },
      ),
    }),
    regulations: f.group(['اللوائح والوثائق', 'Regulations and documents'], {
      title: optionalText('العنوان', 'Heading'),
      description: optionalPara('الوصف', 'Description'),
      buttonLabel: optionalText('نص زر التصفح', 'Browse button text'),
      items: f.list(
        ['الوثائق', 'Documents'],
        ['وثيقة', 'Document'],
        f.group(['وثيقة', 'Document'], {
          title: f.text(['العنوان', 'Title']),
          description: f.para(['الوصف', 'Description']),
          file: f.file(['الملف (PDF)', 'File (PDF)'], { optional: true }),
          size: f.string(['حجم الملف', 'File size'], { optional: true }),
          icon: icon(),
        }),
        { max: 12 },
      ),
    }),
    contacts: f.group(['قنوات التواصل', 'Contact channels'], {
      tag: optionalText('العنوان الصغير', 'Eyebrow'),
      title: optionalText('العنوان', 'Heading'),
      description: optionalPara('الوصف', 'Description'),
      items: f.list(
        ['القنوات', 'Channels'],
        ['قناة', 'Channel'],
        f.group(['قناة', 'Channel'], {
          title: f.text(['العنوان', 'Title']),
          kind: f.choice(
            ['النوع', 'Kind'],
            [
              ['address', 'عنوان', 'Address'],
              ['email', 'بريد إلكتروني', 'Email'],
              ['phone', 'هاتف', 'Phone'],
              ['hours', 'أوقات العمل', 'Working hours'],
            ],
          ),
          text: f.para(
            [
              'النص (للعنوان وأوقات العمل)',
              'Text (for an address or working hours)',
            ],
            {
              optional: true,
            },
          ),
          contact: contactRef({ optional: true }),
        }),
        { max: 8 },
      ),
    }),
  },
);
