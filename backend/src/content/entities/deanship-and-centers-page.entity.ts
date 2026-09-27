export type DeanshipAndCenters = {
  name: string;
  name_ar?: string;
  subHead: string;
  subHead_ar?: string;
  about: string;
  about_ar?: string;
  quote: {
    content: string;
    content_ar?: string;
    author: string;
    author_ar?: string;
    position: string;
    position_ar?: string;
  };
  strategicCards: {
    name: string;
    name_ar?: string;
    content: string;
    content_ar?: string;
  }[];
  contact: {
    phone: string;
    email: string;
    availability: string;
    availability_ar?: string;
  };
  qualityAndStandards: {
    content: string;
    content_ar?: string;
    buttons: { content: string; content_ar?: string }[];
  };
  bottomCard: {
    arabicTitle: string;
    englishTitle: string;
    content: string;
    content_ar?: string;
    catchingPhrase: string;
    catchingPhrase_ar?: string;
    subCatchingPhrase: string;
    subCatchingPhrase_ar?: string;
    checkList: { name: string; name_ar?: string }[];
  };
};
