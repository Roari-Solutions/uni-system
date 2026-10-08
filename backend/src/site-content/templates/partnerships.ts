import { f, type PageSchema } from '../schema/fields';
import { icon } from './icons';
import { contactRef } from './site';

/** The three kinds the page filters by; the set is part of the page's design. */
export const PARTNERSHIP_KINDS = [
  ['academic', 'أكاديمية', 'Academic'],
  ['industrial', 'صناعية', 'Industrial'],
  ['research', 'بحثية', 'Research'],
] as const;

export const partnershipsSchema: PageSchema = f.group(
  ['الشراكات والاتفاقيات', 'Partnerships'],
  {
    hero: f.group(['الواجهة', 'Hero'], {
      title: f.text(['العنوان', 'Title']),
      description: f.para(['الوصف', 'Description']),
      horizonTitle: f.text(['عنوان البطاقة الجانبية', 'Side card heading']),
      horizonText: f.para(['نص البطاقة الجانبية', 'Side card text']),
    }),
    stats: f.list(
      ['الأرقام', 'Figures'],
      ['رقم', 'Figure'],
      f.group(['رقم', 'Figure'], {
        value: f.string(['القيمة', 'Value']),
        showPlus: f.boolean(['إظهار علامة +', 'Show a "+" after the value']),
        unit: f.text(['الوحدة', 'Unit'], { optional: true }),
        title: f.text(['العنوان', 'Title']),
        subtitle: f.text(['الوصف', 'Description']),
      }),
      { length: 3 },
    ),
    filters: f.group(['أزرار التصفية', 'Filter buttons'], {
      all: f.text(['الكل', 'All']),
      academic: f.text(['الشراكات الأكاديمية', 'Academic partnerships']),
      industrial: f.text(['الشراكات الصناعية', 'Industrial partnerships']),
      research: f.text(['الاتفاقيات البحثية', 'Research agreements']),
      activeSuffix: f.text(['لاحقة الزر النشط', 'Active button suffix']),
    }),
    searchPlaceholder: f.text(['نص حقل البحث', 'Search field placeholder']),
    noResults: f.text(['رسالة عدم وجود نتائج', 'No results message']),
    fieldLabel: f.text(['عنوان مجال التعاون', '"Field" label']),
    periodLabel: f.text(['عنوان تاريخ التوقيع', '"Signed" label']),
    items: f.list(
      ['الشراكات', 'Partnerships'],
      ['شراكة', 'Partnership'],
      f.group(['شراكة', 'Partnership'], {
        kind: f.choice(['النوع', 'Kind'], PARTNERSHIP_KINDS),
        icon: icon(),
        typeLabel: f.text(['وصف النوع', 'Type label']),
        title: f.text(['الجهة', 'Partner']),
        partner: f.text(['الإطار', 'Framework']),
        description: f.para(['الوصف', 'Description']),
        field: f.text(['مجال التعاون', 'Field']),
        period: f.text(['تاريخ التوقيع والتجديد', 'Signed and valid until']),
      }),
      { max: 60 },
    ),
    cta: f.group(['دعوة للشراكة', 'Partnership invitation'], {
      title: f.text(['العنوان', 'Heading']),
      description: f.para(['الوصف', 'Description']),
      location: f.text(['المكتب', 'Office location']),
      // the email and phone shown beside the office come from this entry of the official contacts
      contact: contactRef(),
    }),
  },
);
