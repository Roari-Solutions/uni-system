import { f, type PageSchema } from '../schema/fields';
import { contactRef } from './site';

const entry = f.group(['سطر', 'Line'], {
  label: f.text(['النص', 'Label']),
  contact: contactRef(),
});

export const contactSchema: PageSchema = f.group(
  ['معلومات التواصل', 'Contact information'],
  {
    hero: f.group(['الواجهة', 'Hero'], {
      title: f.text(['العنوان', 'Title']),
      description: f.para(['الوصف', 'Description']),
      hoursLabel: f.text(['عنوان أوقات العمل', 'Working hours label']),
      hoursValue: f.text(['أوقات العمل', 'Working hours']),
    }),
    location: f.group(['الموقع', 'Location'], {
      title: f.text(['العنوان', 'Heading']),
      description: f.para(['الوصف', 'Description']),
      postalLabel: f.text(['عنوان الرمز البريدي', 'Postal code label']),
      postalValue: f.text(['الرمز البريدي', 'Postal code']),
    }),
    email: f.group(['البريد الإلكتروني', 'Email'], {
      title: f.text(['العنوان', 'Heading']),
      description: f.para(['الوصف', 'Description']),
      items: f.list(['العناوين', 'Addresses'], ['عنوان', 'Address'], entry, {
        min: 1,
        max: 4,
      }),
    }),
    hours: f.group(['أوقات العمل الرسمية', 'Official working hours'], {
      title: f.text(['العنوان', 'Heading']),
      description: f.para(['الوصف', 'Description']),
      workdays: f.text(['أيام العمل', 'Working days']),
      workHours: f.text(['ساعات العمل', 'Working hours']),
      weekend: f.text(['أيام العطلة', 'Days off']),
      weekendNote: f.text(['ملاحظة العطلة', 'Days off note']),
    }),
    map: f.group(['الخريطة', 'Map'], {
      title: f.text(['العنوان', 'Heading']),
      subtitle: f.text(['العنوان الفرعي', 'Subheading']),
      badge: f.text(['الشارة', 'Badge']),
      embedUrl: f.string(['رابط تضمين الخريطة', 'Map embed link'], {
        format: 'url',
        help: [
          'رابط خرائط Google بصيغة التضمين (output=embed)',
          'A Google Maps embed link (output=embed)',
        ],
      }),
    }),
    phoneGroups: f.list(
      ['مجموعات الهواتف', 'Phone groups'],
      ['مجموعة', 'Group'],
      f.group(['مجموعة', 'Group'], {
        badge: f.text(['الشارة', 'Badge']),
        title: f.text(['العنوان', 'Heading']),
        description: f.para(['الوصف', 'Description']),
        numbers: f.list(['الأرقام', 'Numbers'], ['رقم', 'Number'], entry, {
          min: 1,
          max: 6,
        }),
        note: f.text(['ملاحظة', 'Note']),
      }),
      { length: 2 },
    ),
  },
);
