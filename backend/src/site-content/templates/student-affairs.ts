import { f, type PageSchema } from '../schema/fields';

const bullets = (max: number) =>
  f.list(
    ['النقاط', 'Bullet points'],
    ['نقطة', 'Point'],
    f.para(['النقطة', 'Point']),
    { max },
  );

export const studentAffairsSchema: PageSchema = f.group(
  ['عمادة شؤون الطلاب', 'Student affairs deanship'],
  {
    hero: f.group(['الواجهة', 'Hero'], {
      breadcrumb: f.text(['مسار التصفح', 'Breadcrumb'], { optional: true }),
      title: f.text(['العنوان', 'Title']),
      subtitle: f.para(['العنوان الفرعي', 'Subtitle']),
      image: f.image(['صورة الخلفية', 'Background image']),
    }),
    about: f.group(['عن العمادة', 'About'], {
      title: f.text(['العنوان', 'Heading']),
      text: f.para(['النص', 'Text']),
    }),
    deanMessage: f.group(['كلمة العميد', "Dean's message"], {
      title: f.text(['العنوان', 'Heading']),
      paragraphs: f.list(
        ['الفقرات', 'Paragraphs'],
        ['فقرة', 'Paragraph'],
        f.para(['الفقرة', 'Paragraph']),
        {
          min: 1,
          max: 10,
        },
      ),
    }),
    visionMission: f.group(
      ['الرؤية والرسالة والقيم', 'Vision, mission and values'],
      {
        visionTitle: f.text(['عنوان الرؤية', 'Vision heading']),
        vision: f.para(['الرؤية', 'Vision']),
        missionTitle: f.text(['عنوان الرسالة', 'Mission heading']),
        mission: f.para(['الرسالة', 'Mission']),
        valuesTitle: f.text(['عنوان القيم', 'Values heading']),
        values: f.list(
          ['القيم', 'Values'],
          ['قيمة', 'Value'],
          f.text(['القيمة', 'Value']),
          { min: 1, max: 10 },
        ),
      },
    ),
    goals: f.group(['الأهداف', 'Goals'], {
      title: f.text(['العنوان', 'Heading']),
      intro: f.para(['المقدمة', 'Introduction']),
      items: bullets(12),
    }),
    departments: f.group(['أقسام العمادة', 'Sections of the deanship'], {
      title: f.text(['العنوان', 'Heading']),
      items: f.list(
        ['الأقسام', 'Sections'],
        ['قسم', 'Section'],
        f.group(['قسم', 'Section'], {
          title: f.text(['اسم القسم', 'Name']),
          description: f.para(['الوصف', 'Description'], { optional: true }),
          blocks: f.list(
            ['الفقرات الفرعية', 'Sub-sections'],
            ['فقرة فرعية', 'Sub-section'],
            f.group(['فقرة فرعية', 'Sub-section'], {
              heading: f.text(['العنوان', 'Heading'], { optional: true }),
              paragraph: f.para(['النص', 'Text'], { optional: true }),
              bullets: bullets(12),
            }),
            { max: 4 },
          ),
        }),
        { min: 1, max: 10 },
      ),
    }),
    formerDeans: f.group(['العمداء السابقون', 'Former deans'], {
      title: f.text(['العنوان', 'Heading']),
      numberColumn: f.text(['عنوان عمود الرقم', '"No." column heading']),
      nameColumn: f.text(['عنوان عمود الاسم', '"Name" column heading']),
      periodColumn: f.text(['عنوان عمود الفترة', '"Period" column heading']),
      items: f.list(
        ['العمداء', 'Deans'],
        ['عميد', 'Dean'],
        f.group(['عميد', 'Dean'], {
          name: f.text(['الاسم', 'Name']),
          period: f.text(['الفترة', 'Period']),
        }),
        { max: 30 },
      ),
    }),
    sidebar: f.group(['الفهرس الجانبي', 'Side index'], {
      title: f.text(['العنوان', 'Heading']),
      items: f.list(
        ['البنود', 'Entries'],
        ['بند', 'Entry'],
        f.text(['البند', 'Entry']),
        {
          length: 6,
          help: [
            'كل بند ينقل إلى القسم المقابل بالترتيب',
            'Each entry jumps to the matching section, in order',
          ],
        },
      ),
    }),
  },
);
