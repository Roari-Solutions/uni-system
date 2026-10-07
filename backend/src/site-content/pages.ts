import type { Label, PageSchema } from './schema/fields';
import { aboutSchema } from './templates/about';
import { collegeSchema } from './templates/college';
import { contactSchema } from './templates/contact';
import { gallerySchema } from './templates/gallery';
import { homeSchema } from './templates/home';
import { directorSchema, leaderSchema } from './templates/leader';
import { librarySchema } from './templates/library';
import { partnershipsSchema } from './templates/partnerships';
import { publicRelationsSchema } from './templates/public-relations';
import { scientificAffairsSchema } from './templates/scientific-affairs';
import { contactsSchema, footerSchema } from './templates/site';
import { studentAffairsSchema } from './templates/student-affairs';
import { unitSchema } from './templates/unit';

/** Every page layout the website has; several pages may share one. */
export const TEMPLATES = {
  contacts: contactsSchema,
  footer: footerSchema,
  home: homeSchema,
  about: aboutSchema,
  contact: contactSchema,
  gallery: gallerySchema,
  partnerships: partnershipsSchema,
  leader: leaderSchema,
  director: directorSchema,
  unit: unitSchema,
  'student-affairs': studentAffairsSchema,
  library: librarySchema,
  'public-relations': publicRelationsSchema,
  'scientific-affairs': scientificAffairsSchema,
  college: collegeSchema,
} satisfies Record<string, PageSchema>;

export type TemplateKey = keyof typeof TEMPLATES;

/** Where a page sits in the dashboard's page list. */
export type PageGroup = 'site' | 'about' | 'leaders' | 'units' | 'colleges';

export interface SitePage {
  /** The page's id; for website pages, its path without the leading slash. */
  key: string;
  template: TemplateKey;
  group: PageGroup;
  label: Label;
  /** The website path that shows it, or null for content shared by every page. */
  path: string | null;
}

const page = (
  key: string,
  template: TemplateKey,
  group: PageGroup,
  ar: string,
  en: string,
  path: string | null = `/${key}`,
): SitePage => ({ key, template, group, label: { ar, en }, path });

const college = (slug: string, ar: string, en: string) =>
  page(`colleges/${slug}`, 'college', 'colleges', ar, en);

/**
 * The website's pages. Which pages exist is part of the website's structure:
 * a new page needs a website change and an entry here, never an editor action.
 */
export const PAGES: readonly SitePage[] = [
  page(
    'site/contacts',
    'contacts',
    'site',
    'أرقام وعناوين التواصل الرسمية',
    'Official contacts',
    null,
  ),
  page('site/footer', 'footer', 'site', 'تذييل الموقع', 'Site footer', null),
  page('home', 'home', 'site', 'الصفحة الرئيسية', 'Home page', '/'),
  page('about', 'about', 'about', 'عن الجامعة', 'About the university'),
  page(
    'about/contact',
    'contact',
    'about',
    'معلومات التواصل',
    'Contact information',
  ),
  page('about/gallery', 'gallery', 'about', 'معرض الصور', 'Photo gallery'),
  page(
    'about/partnerships',
    'partnerships',
    'about',
    'الشراكات والاتفاقيات',
    'Partnerships',
  ),
  page(
    'scientific-affairs',
    'scientific-affairs',
    'about',
    'أمانة الشؤون العلمية',
    'Scientific affairs',
  ),
  page(
    'about/university-director',
    'director',
    'leaders',
    'مدير الجامعة',
    'University director',
  ),
  page(
    'about/executive-office',
    'leader',
    'leaders',
    'المكتب التنفيذي لمدير الجامعة',
    'Executive office',
  ),
  page(
    'about/vice-chancellor',
    'leader',
    'leaders',
    'وكيل الجامعة',
    'Vice chancellor',
  ),
  page(
    'about/scientific-affairs-secretary',
    'leader',
    'leaders',
    'أمين الشؤون العلمية',
    'Scientific affairs secretary',
  ),
  page(
    'about/public-relations-media',
    'public-relations',
    'leaders',
    'إدارة العلاقات العامة والإعلام',
    'Public relations and media',
  ),
  page(
    'deanships/student-affairs',
    'student-affairs',
    'units',
    'عمادة شؤون الطلاب',
    'Student affairs deanship',
  ),
  page(
    'deanships/libraries',
    'library',
    'units',
    'عمادة المكتبات',
    'Libraries deanship',
  ),
  page(
    'centers/information-technology',
    'unit',
    'units',
    'مركز تقنية المعلومات',
    'IT center',
  ),
  page(
    'centers/media-center',
    'unit',
    'units',
    'المركز الإعلامي',
    'Media center',
  ),
  page(
    'centers/strategy-future-sciences',
    'unit',
    'units',
    'مركز الاستراتيجية وعلوم المستقبل',
    'Strategy and future sciences center',
  ),
  college('business-studies', 'كلية الدراسات التجارية', 'Business Studies'),
  college('architecture', 'كلية العمارة', 'Architecture'),
  college(
    'civil-electrical-electronic-engineering',
    'كلية الهندسة المدنية والكهربائية والإلكترونية',
    'Civil, Electrical and Electronic Engineering',
  ),
  college(
    'computer-science-information-technology',
    'كلية علوم الحاسوب وتقانة المعلومات',
    'Computer Science and IT',
  ),
  college('nursing-sciences', 'كلية علوم التمريض', 'Nursing Sciences'),
  college('information-systems', 'كلية نظم المعلومات', 'Information Systems'),
  college('law', 'كلية القانون', 'Law'),
  college(
    'postgraduate-studies',
    'كلية الدراسات العليا',
    'Postgraduate Studies',
  ),
  college(
    'medical-laboratory-science',
    'كلية علوم المختبرات الطبية',
    'Medical Laboratory Science',
  ),
];

const BY_KEY = new Map(PAGES.map((p) => [p.key, p]));

/** The page registered under this key, if any. */
export const findPage = (key: string): SitePage | undefined => BY_KEY.get(key);

/** The schema a page's content must fit. */
export const schemaOf = (page: SitePage): PageSchema =>
  TEMPLATES[page.template];
