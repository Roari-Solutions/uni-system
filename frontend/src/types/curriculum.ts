import type { Localized } from "../mocks/faculties";

export type Curriculum = {
	id: string;
	name: Localized;
	facultyId: string;
	abbreviation: string;
	academicYear: string;
};
