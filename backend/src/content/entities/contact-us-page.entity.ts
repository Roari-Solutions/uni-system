export type ContactUs = {
  contactData: string;
  location: string;
  email: {
    public: string;
    documentation: string;
  };
  openTimes: { day: string; start: string; end: string }[];
  phones: { entity: string; phone: string }[];

  transparencyAndAcademics: string; //link
};
