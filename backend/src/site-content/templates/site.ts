import { f, type Field, type PageSchema } from '../schema/fields';

const contact = (ar: string, en: string): Field =>
  f.group([ar, en], {
    label: f.text(['الاسم الظاهر', 'Display name']),
    phone: f.string(['الهاتف', 'Phone'], { format: 'phone' }),
    ext: f.string(['التحويلة', 'Extension'], { optional: true }),
    email: f.string(['البريد الإلكتروني', 'Email'], { format: 'email' }),
  });

/**
 * The university's official phone numbers and emails. Pages show these by key,
 * so a number changed here changes everywhere it appears. The set of entries is
 * fixed; a new office needs a website change to be shown anywhere.
 */
export const contactsSchema: PageSchema = f.group(
  ['أرقام وعناوين التواصل الرسمية', 'Official contacts'],
  {
    switchboard: contact('البدالة العامة', 'Switchboard'),
    admissions: contact('القبول والتسجيل', 'Admissions'),
    studentAffairs: contact('عمادة شؤون الطلاب', 'Student affairs'),
    finance: contact('الشؤون المالية', 'Finance'),
    humanResources: contact('الموارد البشرية', 'Human resources'),
    itCenter: contact('مركز تقنية المعلومات', 'IT center'),
    scientificAffairs: contact('أمانة الشؤون العلمية', 'Scientific affairs'),
    universityDirector: contact(
      'مكتب مدير الجامعة',
      "University director's office",
    ),
    viceChancellor: contact('وكالة الجامعة', 'Vice chancellor'),
    libraries: contact('عمادة المكتبات', 'Libraries'),
    strategyCenter: contact(
      'مركز الاستراتيجية وعلوم المستقبل',
      'Strategy center',
    ),
    mediaCenter: contact('المركز الإعلامي', 'Media center'),
    partnerships: contact('الشراكات والتعاون', 'Partnerships'),
    publicRelations: contact(
      'إدارة العلاقات العامة والإعلام',
      'Public relations and media',
    ),
  },
);

const link = f.group(['رابط', 'Link'], {
  label: f.text(['النص', 'Text']),
  href: f.string(['العنوان', 'Address'], { format: 'url' }),
});

/** The footer shown on every page. Its phone and email come from the official contacts. */
export const footerSchema: PageSchema = f.group(
  ['تذييل الموقع', 'Site footer'],
  {
    brandName: f.text(['اسم الجامعة', 'University name']),
    contact: f.group(['العنوان والتواصل', 'Address and contact'], {
      title: f.text(['العنوان', 'Heading']),
      address: f.text(['العنوان البريدي', 'Address']),
      poBox: f.text(['صندوق البريد', 'P.O. box']),
    }),
    social: f.group(['حسابات التواصل الاجتماعي', 'Social accounts'], {
      facebook: f.string(['فيسبوك', 'Facebook'], { format: 'url' }),
      x: f.string(['إكس', 'X'], { format: 'url' }),
      linkedin: f.string(['لينكدإن', 'LinkedIn'], { format: 'url' }),
      youtube: f.string(['يوتيوب', 'YouTube'], { format: 'url' }),
    }),
    importantLinks: f.group(['روابط مهمة', 'Important links'], {
      title: f.text(['العنوان', 'Heading']),
      links: f.list(['الروابط', 'Links'], ['رابط', 'Link'], link, { max: 8 }),
    }),
    collegesAndCenters: f.group(['الكليات والمراكز', 'Colleges and centers'], {
      title: f.text(['العنوان', 'Heading']),
      links: f.list(['الروابط', 'Links'], ['رابط', 'Link'], link, { max: 8 }),
    }),
    newsletter: f.group(['النشرة الإخبارية', 'Newsletter'], {
      title: f.text(['العنوان', 'Heading']),
      description: f.para(['الوصف', 'Description']),
      placeholder: f.text(['نص حقل البريد', 'Email field placeholder']),
      buttonLabel: f.text(['نص الزر', 'Button text']),
    }),
    copyright: f.text(['حقوق النشر', 'Copyright'], {
      help: [
        'تُضاف علامة © والسنة الحالية تلقائياً',
        'The © sign and current year are added automatically',
      ],
    }),
  },
);

/** Points at one entry of the official contacts, so the number itself lives in one place. */
export const contactRef = ({ optional = false } = {}) =>
  f.choice(
    ['جهة التواصل', 'Contact entry'],
    [
      ...(optional ? [['', 'بدون', 'None'] as const] : []),
      ...Object.entries(contactsSchema.fields).map(
        ([key, field]) => [key, field.label.ar, field.label.en] as const,
      ),
    ],
  );
