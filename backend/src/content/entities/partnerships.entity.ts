export type Partnerships = {
  heroSection: {
    mainHead: string;
    mainHead_ar?: string;
    subHead: string;
    subHead_ar?: string;
    partnershipVision: string;
    partnershipVision_ar?: string;
  };
  stats: {
    icon: string;
    title: string;
    title_ar?: string;
    content: string;
    content_ar?: string;
  }[];
  partnerships: {
    icon: string;
    tag: string;
    tag_ar?: string;
    title: string;
    title_ar?: string;
    subTitle: string;
    subTitle_ar?: string;
    content: string;
    content_ar?: string;
    field: string;
    field_ar?: string;
    date: string;
  }[];
  contactsCard: {
    heading: string;
    heading_ar?: string;
    subHead: string;
    subHead_ar?: string;
    email: string;
    phone: string;
    location: string;
    location_ar?: string;
  };
};
