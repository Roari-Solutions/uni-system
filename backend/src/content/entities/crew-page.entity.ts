export type CrewPage = {
  name: string;
  name_ar?: string;
  subHead: string;
  subHead_ar?: string;
  about: string;
  about_ar?: string;
  statsDetails: { stats: number; content: string; content_ar?: string }[];
  departmentGuide: string;
  departmentGuide_ar?: string;
  photo: string;
  tag: string;
  tag_ar?: string;
  strategicCards: { name: string; name_ar?: string; content: string; content_ar?: string }[];
  basicVision: { icon: string; content: string; content_ar?: string }[];
  wordFromDept: {
    title: string;
    title_ar?: string;
    details: string;
    details_ar?: string;
    profName: string;
    profName_ar?: string;
  }[];
  jobDesc: { icon: string; title: string; title_ar?: string; subTitle: string; subTitle_ar?: string }[];
  guidelines: {
    icon: string;
    title: string;
    title_ar?: string;
    subTitle: string;
    subTitle_ar?: string;
    guideLink: string;
  }[];
  contacts: {
    heading: string;
    heading_ar?: string;
    subHead: string;
    subHead_ar?: string;
    card: { icon: string; title: string; title_ar?: string; subTitle: string; subTitle_ar?: string }[];
  };
};
