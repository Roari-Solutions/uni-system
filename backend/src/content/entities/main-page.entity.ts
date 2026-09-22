export type MainPageContent = {
  heroSection: {
    backgroundImages: string[];
    mainHeading: string;
    subHeading: string;
  };
  managerWordSection: {
    managerPicture: string;
    managerName: string;
    managerWord: string;
  };
  visionSection: {
    card: { title: string; content: string }[];
  };
  newsSection: {
    cards: {
      pictureLink: string;
      tag: string;
      title: string;
      content: string;
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
      location: string;
    };
    importantLinks: { link: string; name: string }[];
    collegesAndCenters: { link: string; name: string }[];
  };
};
