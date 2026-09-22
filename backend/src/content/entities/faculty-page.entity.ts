export type FacultyPageContent = {
  title: string;
  heroSection: {
    backgroundImages: string[];
    mainHead: string;
    subHeading: string;
  };
  pageCatalog: string;
  specializations: number;
  currentStudents: number;
  graduatedStudents: number;
  about: string;
  quote: {
    content: string;
    author: string;
    position: string;
  };
  vision: { title: string; content: string; icon: string }[];
  goals: { title: string; content: string }[];
  programs: {
    tag: string;
    title: string;
    subTitle: string;
    level: string;
    content: string;
    hours: number;
    track: string;
  }[];
  acceptanceConditions: {
    conditionTitle: string;
    content: string;
    detail: string;
  }[];
  requiredPapers: { point: string }[];
  applicationDuration: string;
  creditHoursDetails: { title: string; content: string }[];
};
