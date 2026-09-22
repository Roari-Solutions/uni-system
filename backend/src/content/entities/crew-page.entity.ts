export type CrewPage = {
  name: string;
  subHeading: string;
  about: string;
  statsDetails: { stats: number; content: string }[];
  departmentGuide: string;
  photo: string;
  tag: string;
  strategicCards: { name: string; content: string }[];
  basicVision: { icon: string; content: string }[];
  wordFromDept: { title: string; details: string; profName: string }[];
  jobDesc: { icon: string; title: string; subTitle: string }[];
  guidelines: {
    icon: string;
    title: string;
    subTitle: string;
    guideLink: string;
  }[];
  contacts: {
    heading: string;
    subheading: string;
    card: { icon: string; title: string; subTitle: string }[];
  };
};
