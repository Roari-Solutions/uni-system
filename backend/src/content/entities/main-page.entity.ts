export type MainPageContent = {
  heroSection: {
    backgroundImages: string[];
    mainHead: string;
    mainHead_ar?: string;
    subHead: string;
    subHead_ar?: string;
  };
  managerWordSection: {
    managerPicture: string;
    managerName: string;
    managerName_ar?: string;
    managerWord: string;
    managerWord_ar?: string;
  };
  visionSection: {
    card: { title: string; title_ar?: string; content: string; content_ar?: string }[];
  };
  newsSection: {
    cards: {
      pictureLink: string;
      tag: string;
      tag_ar?: string;
      title: string;
      title_ar?: string;
      content: string;
      content_ar?: string;
      date: string;
    }[];
  };
  analytics: {
    researchCenters: number;
    employeesNumber: number;
    collegeCount: number;
    studentsCount: number;
    femaleStudents: number;
    maleStudents: number;
  };
  footerSection: {
    contactsAndLocationSection: {
      email: string;
      phone: string;
      box: string;
      box_ar?: string;
      location: string;
      location_ar?: string;
    };
    importantLinks: { link: string; name: string; name_ar?: string }[];
    collegesAndCenters: { link: string; name: string; name_ar?: string }[];
  };
};
