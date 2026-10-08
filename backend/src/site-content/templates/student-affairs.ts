import { f, type PageSchema } from '../schema/fields';

export const bullets = (max: number) =>
  f.list(
    ['النقاط', 'Bullet points'],
    ['نقطة', 'Point'],
    f.para(['النقطة', 'Point']),
    { max },
  );

/** One section of a deanship: a name, a description and up to four sub-sections. */
export const departmentItem = f.group(['قسم', 'Section'], {
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
});

type Labels = [ar: string, en: string];

/**
 * The table of those who held a post before: the same shape on every page that
 * has one, labelled for the post (deans on a deanship, managers on an administration).
 */
export const formerHoldersTable = (section: Labels, people: Labels, person: Labels) =>
  f.group(section, {
    title: f.text(['العنوان', 'Heading']),
    numberColumn: f.text(['عنوان عمود الرقم', '"No." column heading']),
    nameColumn: f.text(['عنوان عمود الاسم', '"Name" column heading']),
    periodColumn: f.text(['عنوان عمود الفترة', '"Period" column heading']),
    items: f.list(
      people,
      person,
      f.group(person, {
        name: f.text(['الاسم', 'Name']),
        period: f.text(['الفترة', 'Period']),
        image: f.image(['الصورة', 'Photo'], { optional: true }),
      }),
      { max: 30 },
    ),
  });

/** The former deans' table. */
export const formerDeans = formerHoldersTable(
  ['العمداء السابقون', 'Former deans'],
  ['العمداء', 'Deans'],
  ['عميد', 'Dean'],
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
        departmentItem,
        { min: 1, max: 10 },
      ),
    }),
    formerDeans,
    news: f.group(['أخبار العمادة', 'Deanship news'], {
      title: f.text(['العنوان', 'Heading']),
      items: f.list(
        ['الأخبار', 'News'],
        ['خبر', 'News item'],
        f.group(['خبر', 'News item'], {
          title: f.text(['العنوان', 'Title']),
          date: f.string(['التاريخ', 'Date'], { format: 'date' }),
          image: f.image(['الصورة', 'Image']),
          excerpt: f.para(['الملخص', 'Summary']),
        }),
        {
          max: 12,
          help: [
            'يُخفى القسم إذا لم تكن هناك أخبار',
            'The section is hidden while there is no news',
          ],
        },
      ),
    }),
  },
);
