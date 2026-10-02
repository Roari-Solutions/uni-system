import { f, type PageSchema } from '../schema/fields';
import { icon } from './icons';

const optionalText = (ar: string, en: string) =>
  f.text([ar, en], { optional: true });
const optionalPara = (ar: string, en: string) =>
  f.para([ar, en], { optional: true });
const points = (ar: string, en: string) =>
  f.list([ar, en], ['بند', 'Point'], f.para(['البند', 'Point']), { max: 20 });

/**
 * A college's page. Its section names and side menu are shared by every
 * college and stay in the website; each section is hidden while it is empty.
 */
export const collegeSchema: PageSchema = f.group(
  ['صفحة كلية', 'College page'],
  {
    name: f.text(['اسم الكلية', 'College name']),
    hero: f.group(['الواجهة', 'Hero'], {
      image: f.image(['صورة الخلفية', 'Background image']),
      eyebrow: optionalText('العنوان الصغير', 'Eyebrow'),
      title: f.text(['العنوان', 'Title']),
      subtitle: optionalPara('العنوان الفرعي', 'Subtitle'),
      brochure: f.file(['الدليل التعريفي (PDF)', 'Brochure (PDF)'], {
        optional: true,
      }),
    }),
    statistics: f.list(
      ['الأرقام', 'Figures'],
      ['رقم', 'Figure'],
      f.group(['رقم', 'Figure'], {
        value: f.string(['القيمة', 'Value']),
        label: f.text(['الوصف', 'Label']),
      }),
      { max: 6 },
    ),
    contact: f.group(['التواصل', 'Contact'], {
      phone: f.string(['الهاتف', 'Phone'], { format: 'phone', optional: true }),
      email: f.string(['البريد الإلكتروني', 'Email'], {
        format: 'email',
        optional: true,
      }),
      location: optionalText('الموقع', 'Location'),
      workingHours: optionalText('مواعيد العمل', 'Working hours'),
    }),
    about: f.group(['نبذة عن الكلية', 'About the college'], {
      summary: optionalPara('الفقرة الافتتاحية', 'Lead paragraph'),
      description: optionalPara('النبذة', 'About'),
      deanMessage: optionalPara('رسالة العميد', "Dean's message"),
      deanName: optionalText('اسم العميد', "Dean's name"),
      deanTitle: optionalText('صفة العميد', "Dean's title"),
    }),
    administration: f.group(['إدارة الكلية', 'College administration'], {
      dean: optionalText('عميد الكلية', 'Dean'),
      viceDean: optionalText('نائب العميد', 'Vice dean'),
      registrar: optionalText('مسجل الكلية', 'Registrar'),
    }),
    vision: optionalPara('الرؤية', 'Vision'),
    mission: optionalPara('الرسالة', 'Mission'),
    strategicGoals: f.list(
      ['الأهداف الاستراتيجية', 'Strategic goals'],
      ['هدف', 'Goal'],
      f.group(['هدف', 'Goal'], {
        title: f.text(['العنوان', 'Title']),
        description: f.para(['الوصف', 'Description']),
        icon: icon(),
      }),
      { max: 12 },
    ),
    programs: f.list(
      ['البرامج الأكاديمية', 'Academic programs'],
      ['برنامج', 'Program'],
      f.group(['برنامج', 'Program'], {
        degree: f.text(['الدرجة', 'Degree']),
        code: f.string(['الرمز', 'Code'], { optional: true }),
        name: f.text(['اسم البرنامج', 'Program name'], {
          help: [
            'يظهر الاسم الإنجليزي تحت الاسم العربي في الموقع العربي',
            'On the Arabic site the English name shows under the Arabic one',
          ],
        }),
        description: f.para(['الوصف', 'Description']),
        studyDuration: f.number(['عدد السنوات الدراسية', 'Years of study'], {
          integer: true,
          optional: true,
        }),
      }),
      { max: 30 },
    ),
    admission: f.group(['شروط ومتطلبات القبول', 'Admission requirements'], {
      scorePercentage: optionalText('نسبة القبول', 'Admission score'),
      requiredCertificate: optionalText(
        'الشهادة المطلوبة',
        'Required certificate',
      ),
      englishLevel: optionalText('مستوى اللغة الإنجليزية', 'English level'),
      officialDocuments: points('المستندات المطلوبة', 'Required documents'),
      importantDates: optionalPara('مواعيد هامة', 'Important dates'),
      additionalInfo: optionalPara('معلومات إضافية', 'Additional information'),
    }),
    graduation: f.group(
      ['نظام الدراسة ومتطلبات التخرج', 'Study system and graduation'],
      {
        creditHourSystem: optionalPara('نظام الدراسة', 'Study system'),
        requirements: points('متطلبات التخرج', 'Graduation requirements'),
        internship: optionalPara('التدريب الميداني', 'Internship'),
        additionalConditions: points('شروط إضافية', 'Additional conditions'),
      },
    ),
    news: f.list(
      ['أخبار الكلية', 'College news'],
      ['خبر', 'News item'],
      f.group(['خبر', 'News item'], {
        title: f.text(['العنوان', 'Title']),
        date: f.string(['التاريخ', 'Date'], { format: 'date' }),
        image: f.image(['الصورة', 'Image']),
        excerpt: f.para(['الملخص', 'Summary']),
      }),
      { max: 12 },
    ),
    formerDeans: f.list(
      ['العمداء السابقون', 'Former deans'],
      ['عميد', 'Dean'],
      f.group(['عميد', 'Dean'], {
        name: f.text(['الاسم', 'Name']),
        period: f.string(['الفترة', 'Period'], { optional: true }),
        image: f.image(['الصورة', 'Photo'], { optional: true }),
      }),
      { max: 30 },
    ),
  },
);
