export type DeanshipAndCenters = {
  name: string;
  subHeading: string;
  about: string;
  quote: {
    content: string;
    author: string;
    position: string;
  };
  strategicCards: {
    name: string;
    content: string;
  }[];
  contact: {
    phone: string;
    email: string;
    availability: string;
  };
  qualityAndStandards: {
    content: string;
    buttons: { content: string }[];
  };
  bottomCard: {
    arabicTitle: string;
    englishTitle: string;
    content: string;
    catchingPhrase: string;
    subCatchingPhrase: string;
    checkList: { name: string }[];
  };
};
