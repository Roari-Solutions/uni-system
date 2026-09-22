export type ScientificAffairsPage = {
  heroSection: {
    subHeading: string;
    content: string;
    regulationsCount: number;
    academicDecisions: number;
    academicUnit: number;
    scientificService: number;
  };
  overview: string;
  quote: {
    content: string;
    author: string;
    position: string;
  };
  vision: { icon: string; title: string; content: string }[];
  specialities: { title: string; content: string }[];
  councilsAndCommittees: {
    icon: string;
    name: string;
    link: { name: string; link: string };
  }[];
  scientificServices: { name: string; content: string }[];
  resources: { title: string; metadata: string; pdfLink: string }[];
  contacts: {
    email: string;
    phone: string;
    workTime: string;
  };
};
