/** A titled text card (vision, mission). */
type TextCard = {
  title: string;
  text: string;
};

/** A titled card made of several paragraphs (study system, graduation requirements). */
type ParagraphsCard = {
  title: string;
  paragraphs: string[];
};

/** An admission criterion shown as a headline value with a short note under it. */
type AdmissionCriterion<T> = {
  value: T;
  note: string;
};

/**
 * Shape of a faculty sub page JSON document. Images and files are stored as hashes.
 * The faculty name comes from `faculties.name` and the programs count from `programs.length`.
 */
export type FacultyPageContent = {
  hero: {
    backgroundImage: string;
    englishName: string;
    code: string;
    accreditation?: string;
    description: string;
    brochure: string;
    studentsCount: number;
  };
  about: {
    text: string;
    dean: {
      name: string;
      title: string;
      quote: string;
    };
  };
  visionMission: {
    vision: TextCard;
    mission: TextCard;
  };
  goals: {
    title: string;
    description: string;
  }[];
  programs: {
    code: string;
    name: string;
    englishName: string;
    degree: string;
    duration: string;
    description: string;
    creditHours: number;
    track: string;
    tag?: string;
    studyPlan: string;
  }[];
  admission: {
    minimumGrade: AdmissionCriterion<number>;
    englishProficiency: AdmissionCriterion<string>;
    interview: AdmissionCriterion<string>;
    documents: string[];
    applicationDeadline: string;
  };
  studySystem: {
    system: ParagraphsCard;
    graduation: ParagraphsCard;
  };
};
