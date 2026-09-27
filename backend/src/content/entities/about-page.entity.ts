export type AboutUs = {
  heroSection: {
    backgroundImages: string[];
    mainHead: string;
    mainHead_ar?: string;
    subHead: string;
    subHead_ar?: string;
  };
  stats: { title: string; title_ar?: string; content: string; content_ar?: string; moreInfo: string; moreInfo_ar?: string }[];
  collegeImageCard: string[];
  principles: {
    title: string;
    title_ar?: string;
    subTitle: string;
    subTitle_ar?: string;
    card: {
      title: string;
      title_ar?: string;
      content: string;
      content_ar?: string;
    };
  };
  journey: {
    card: {
      title: string;
      title_ar?: string;
      content: string;
      content_ar?: string;
      year: string;
      year_ar?: string;
      tag: string;
      tag_ar?: string;
    };
  };
  visionAndMessage: {
    card: {
      icon: string;
      title: string;
      title_ar?: string;
      content: string;
      content_ar?: string;
    };
  };
  goals: { title: string; title_ar?: string; content: string; content_ar?: string }[];
  academicPrinciples: {
    card: {
      icon: string;
      title: string;
      title_ar?: string;
      content: string;
      content_ar?: string;
    }[];
  };
  givenCertificates: {
    title: string;
    arTitle: string;
    content: string;
    content_ar?: string;
    tag: string;
    tag_ar?: string;
    miniTag: string;
    miniTag_ar?: string;
  }[];

  admissionTitle: string;
  admissionTitle_ar?: string;
  admissionSubTitle: string;
  admissionSubTitle_ar?: string;
  admissionGuidelines: string;
  admissionGuidelines_ar?: string;
};
