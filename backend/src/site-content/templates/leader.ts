import { f, type PageSchema } from '../schema/fields';
import { icon } from './icons';
import { contactRef } from './site';

/** Who held the post before, shown at the foot of the page while the list has anyone in it. */
export const formerHolders = f.group(
  ['شاغلو المنصب سابقاً', 'Former holders'],
  {
    title: f.text(['العنوان', 'Heading'], { optional: true }),
    items: f.list(
      ['الأشخاص', 'People'],
      ['شخص', 'Person'],
      f.group(['شخص', 'Person'], {
        name: f.text(['الاسم', 'Name']),
        period: f.text(['الفترة', 'Period'], { optional: true }),
        image: f.image(['الصورة', 'Photo'], { optional: true }),
      }),
      {
        max: 30,
        help: [
          'يُخفى القسم إذا كانت القائمة فارغة',
          'The section is hidden while the list is empty',
        ],
      },
    ),
  },
);

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
    about: f.group(['النبذة', 'About'], {
      title: optionalText('العنوان', 'Heading'),
      text: optionalPara('النص', 'Text'),
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
    departments: f.group(['الإدارات التابعة', 'Departments'], {
      tag: optionalText('العنوان الصغير', 'Eyebrow'),
      title: optionalText('العنوان', 'Heading'),
      description: optionalPara('الوصف', 'Description'),
      items: f.list(
        ['الإدارات', 'Departments'],
        ['إدارة', 'Department'],
        f.group(['إدارة', 'Department'], {
          title: f.text(['اسم الإدارة', 'Name']),
          description: optionalPara('الوصف', 'Description'),
          points: f.list(
            ['النقاط', 'Bullet points'],
            ['نقطة', 'Point'],
            f.para(['النقطة', 'Point']),
            { max: 12 },
          ),
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
    formerHolders,
  },
);

/** The university director's page: a leader's page under a full-width banner photo. */
export const directorSchema: PageSchema = f.group(
  ['صفحة مدير الجامعة', "University director's page"],
  {
    banner: f.image(['صورة الشريط العلوي', 'Banner photo'], {
      optional: true,
      help: [
        'تظهر أعلى الصفحة بنفس مقاس صور الكليات؛ لا يظهر الشريط بدون صورة',
        "Shown across the top at the college banners' size; no banner without a photo",
      ],
    }),
    ...leaderSchema.fields,
  },
);
