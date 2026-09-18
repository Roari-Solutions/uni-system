/** Shape of the main page JSON document. Images are stored as hashes. */
export type MainPageContent = {
  hero: {
    backgroundImages: string[];
    name: string;
    logo: string;
    motto: string;
  };
  president: {
    name: string;
    quote: string;
    photo: string;
  };
  logoMeaning: {
    vision: string;
    goals: string[];
    values: string;
    purpose: string;
  };
  contacts: {
    email: string;
    facebook: string;
    instagram: string;
    x: string;
    phone: string;
    whatsapp: string;
  };
};
