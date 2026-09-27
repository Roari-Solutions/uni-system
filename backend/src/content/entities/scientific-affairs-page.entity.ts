export type ScientificAffairsPage = {
  heroSection: {
    subHead: string;
    subHead_ar?: string;
    content: string;
    content_ar?: string;
    regulationsCount: number;
    academicDecisions: number;
    academicUnit: number;
    scientificService: number;
  };
  overview: string;
  overview_ar?: string;
  quote: {
    content: string;
    content_ar?: string;
    author: string;
    author_ar?: string;
    position: string;
    position_ar?: string;
  };
  vision: { icon: string; title: string; title_ar?: string; content: string; content_ar?: string }[];
  specialities: { title: string; title_ar?: string; content: string; content_ar?: string }[];
  councilsAndCommittees: {
    icon: string;
    name: string;
    name_ar?: string;
    link: { name: string; name_ar?: string; link: string };
  }[];
  scientificServices: { name: string; name_ar?: string; content: string; content_ar?: string }[];
  resources: { title: string; title_ar?: string; metadata: string; metadata_ar?: string; pdfLink: string }[];
  contacts: {
    email: string;
    phone: string;
    workTime: string;
    workTime_ar?: string;
  };
};
