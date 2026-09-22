export type AboutUs = {
  heroSection: {
    backgroundImages: string[];
    mainHead: string;
    subHead: string;
  };
  stats: { title: string; content: string; moreInfo: string }[];
  collegeImageCard: string[];
  principles: {
    title: string;
    subTitle: string;
    card: {
      title: string;
      content: string;
    };
  };
  journey: {
    card: {
      title: string;
      content: string;
      year: string;
      tag: string;
    };
  };
  visionAndMessage: {
    card: {
      icon: string;
      title: string;
      content: string;
    };
  };
  goals: { title: string; content: string }[];
  academicPrinciples: {
    card: {
      icon: string;
      title: string;
      content: string;
    }[];
  };
  givenCertificates: {
    title: string;
    arTitle: string;
    content: string;
    tag: string;
    miniTag: string;
  }[];

  admissionTitle: string;
  admissionSubTitle: string;
  admissionGuidelines: string;
};
