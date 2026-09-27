export type FacultyPageContent = {
  title: string;
  title_ar?: string;
  heroSection: {
    backgroundImages: string[];
    mainHead: string;
    mainHead_ar?: string;
    subHead: string;
    subHead_ar?: string;
  };
  pageCatalog: string;
  pageCatalog_ar?: string;
  specializations: number;
  currentStudents: number;
  graduatedStudents: number;
  about: string;
  about_ar?: string;
  quote: {
    content: string;
    content_ar?: string;
    author: string;
    author_ar?: string;
    position: string;
    position_ar?: string;
  };
  vision: { title: string; title_ar?: string; content: string; content_ar?: string; icon: string }[];
  goals: { title: string; title_ar?: string; content: string; content_ar?: string }[];
  programs: {
    tag: string;
    tag_ar?: string;
    title: string;
    title_ar?: string;
    subTitle: string;
    subTitle_ar?: string;
    level: string;
    level_ar?: string;
    content: string;
    content_ar?: string;
    hours: number;
    track: string;
    track_ar?: string;
  }[];
  acceptanceConditions: {
    conditionTitle: string;
    conditionTitle_ar?: string;
    content: string;
    content_ar?: string;
    detail: string;
    detail_ar?: string;
  }[];
  requiredPapers: { point: string; point_ar?: string }[];
  applicationDuration: string;
  applicationDuration_ar?: string;
  creditHoursDetails: { title: string; title_ar?: string; content: string; content_ar?: string }[];
};
