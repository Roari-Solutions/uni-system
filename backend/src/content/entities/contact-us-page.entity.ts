export type ContactUs = {
  contactData: string;
  contactData_ar?: string;
  location: string;
  location_ar?: string;
  email: {
    public: string;
    documentation: string;
  };
  openTimes: { day: string; day_ar?: string; start: string; end: string }[];
  phones: { entity: string; entity_ar?: string; phone: string }[];

  transparencyAndAcademics: string; //link
};
