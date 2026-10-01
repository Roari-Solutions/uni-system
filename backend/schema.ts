import { relations } from 'drizzle-orm';
import { numeric, unique } from 'drizzle-orm/pg-core';
import {
  integer,
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core';
import type { MainPageContent } from 'src/content/entities/main-page.entity';
import type { FacultyPageContent } from 'src/content/entities/faculty-page.entity';
import { AboutUs } from 'src/content/entities/about-page.entity';
import { DeanshipAndCenters } from 'src/content/entities/deanship-and-centers-page.entity';
import { ContactUs } from 'src/content/entities/contact-us-page.entity';
import { CrewPage } from 'src/content/entities/crew-page.entity';
import { ImagesExhibition } from 'src/content/entities/images-exhibition.entity';
import { Partnerships } from 'src/content/entities/partnerships.entity';
import { ScientificAffairsPage } from 'src/content/entities/scientific-affairs-page.entity';
import type { ResultHeader, ResultSheet } from 'src/results/result-sheet';

/** Blood group values stored on users. */
export const bloodTypeEnum = pgEnum('blood_type', [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
]);

/** Academic year = study year (1-6), the level a student or curriculum sits in. */
export const studyLevelEnum = pgEnum('study_level', ['1', '2', '3', '4', '5', '6']);

/**
 * Exams seating status. Absent and barred score 0 (F); substitute is an accepted
 * excuse: no mark until the substitute exam, and left out of the GPA until then.
 */
export const seatingStatusEnum = pgEnum('seating_status', [
  'attended',
  'absent',
  'cheating',
  'barred',
  'substitute',
]);

/** Which re-exam a resit mark came from: supplementary (after an F) or substitute (after an excuse). */
export const resitKindEnum = pgEnum('resit_kind', ['supplementary', 'substitute']);

/** A batch's results: the semester's own exams, or the Sup & Sub re-exams that follow. */
export const resultKindEnum = pgEnum('result_kind', ['regular', 'resit']);

/** Board results wait for approval; approving locks the batch's grades for that semester. */
export const resultStatusEnum = pgEnum('result_status', ['pending', 'approved']);

/** The grading scale, best first; a mark's letter decides its grade points. */
export const letterGradeEnum = pgEnum('letter_grade', ['A', 'B+', 'B', 'C+', 'C', 'D', 'F']);

/** Semester within an academic year; every curriculum runs in exactly one. */
export const semesterEnum = pgEnum('semester', ['1', '2']);

/** Which body requires a curriculum: the university, the faculty, or the major. */
export const requirementTypeEnum = pgEnum('requirement_type', ['university', 'faculty', 'major']);

/** A student is Sudanese (identified by national ID) or foreign (by passport). */
export const nationalityEnum = pgEnum('nationality', ['sudanese', 'foreign']);

/** Per-year student outcome. */
export const studentStatusEnum = pgEnum('student_status_enum', ['pass', 'fail']);

/** Whether a student carried their academic year or must repeat it. */
export const studentResultEnum = pgEnum('student_result', ['success', 'repeat']);

/** Role seniority level (1-4). */
export const roleLevelEnum = pgEnum('role_level', ['1', '2', '3', '4']);

/** Whether a student's record may change: a suspension or dismissal freezes it. */
export const studentStandingEnum = pgEnum('student_standing', ['active', 'suspended', 'dismissed']);

const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** University faculties; each user belongs to at most one. */
export const faculties = pgTable('faculties', {
  id: uuid('id').primaryKey().defaultRandom(),
  abbreviation: text('abbreviation').unique(),
  nameEn: text('name_en').notNull().unique(),
  nameAr: text('name_ar').notNull(),
  ...timestamps(),
});

/** App users (login identity + profile). */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  suspended: boolean('suspended').notNull().default(false),
  phone: text('phone'),
  bloodType: bloodTypeEnum('blood_type'),
  password: text('password').notNull(),
  nationalId: text('national_id').unique(),
  /** Many users may belong to one faculty; null for staff who span all of them. */
  facultyId: uuid('faculty_id').references(() => faculties.id),
  pfp: text('pfp'),
  ...timestamps(),
});
/** User <-> department memberships (one pair once). */
export const usersDepartments = pgTable(
  'users_departments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    departmentId: uuid('department_id')
      .references(() => departments.id)
      .notNull(),
    ...timestamps(),
  },
  (t) => [unique('user_department').on(t.userId, t.departmentId)],
);

/** Organizational departments. */
export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  ...timestamps(),
});

/** Employee roles (each employee holds exactly one). */
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  level: roleLevelEnum('level'),
  ...timestamps(),
});

/** Staff records; one per user (userId unique). */
export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id)
    .unique(),
  departmentId: uuid('department_id')
    .notNull()
    .references(() => departments.id),
  roleId: uuid('role_id')
    .notNull()
    .references(() => roles.id),
  title: text('title'),
  ...timestamps(),
});

/** Granular permissions granted via roles. */
export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  ...timestamps(),
});

/** Role <-> permission grants (one pair once). */
export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id),
  },
  (t) => [unique('role_premission').on(t.permissionId, t.roleId)],
);

/** Work crews, each tied to an employee. */
export const crews = pgTable('crews', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  ...timestamps(),
});

/** Public contact entries (unique names). */
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  value: text('value').notNull(),
  iconName: text('icon_name'),
  ...timestamps(),
});

/** Published news items (unique titles). */
export const news = pgTable('news', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull().unique(),
  content: text('content').notNull(),
  ...timestamps(),
});

// ============================================== ACADEMIC TABLES ==============================================

/**
 * A faculty's academic departments (e.g. Engineering -> Electrical). Not the
 * organizational `departments` employees belong to. A department may hold
 * specializations; students may belong to one; a major may be tied to one, and
 * is then taken by the department's students whatever their specialization.
 */
export const facultyDepartments = pgTable(
  'faculty_departments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    facultyId: uuid('faculty_id')
      .notNull()
      .references(() => faculties.id),
    nameEn: text('name_en').notNull(),
    nameAr: text('name_ar').notNull(),
    ...timestamps(),
  },
  (t) => [
    unique('faculty_department_name_en_unique').on(t.facultyId, t.nameEn),
    unique('faculty_department_name_ar_unique').on(t.facultyId, t.nameAr),
  ],
);

/**
 * A faculty's specializations (e.g. Business Studies -> Economics), directly
 * under the faculty or under one of its departments. Students may carry one; a
 * major requirement may belong to one. Both names are required: the English
 * one prints on the results sheets.
 */
export const specializations = pgTable(
  'specializations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    facultyId: uuid('faculty_id')
      .notNull()
      .references(() => faculties.id),
    /** Null for a specialization directly under the faculty. */
    departmentId: uuid('department_id').references(() => facultyDepartments.id),
    nameEn: text('name_en').notNull(),
    nameAr: text('name_ar').notNull(),
    ...timestamps(),
  },
  (t) => [
    unique('specialization_name_en_unique').on(t.facultyId, t.nameEn),
    unique('specialization_name_ar_unique').on(t.facultyId, t.nameAr),
  ],
);

/** Course curriculums with credit weight. */
export const curriculums = pgTable('curriculums', {
  id: uuid('id').primaryKey().defaultRandom(),
  nameEn: text('name_en').notNull(),
  nameAr: text('name_ar').notNull(),
  /** The curriculum's identifier; names are free text. */
  abbreviation: text().unique(),
  academicYear: studyLevelEnum('academic_year').notNull(),
  /** Defaults to 1 only so rows that predate semesters get one; the API requires it. */
  semester: semesterEnum('semester').notNull().default('1'),
  /** Null only on rows that predate requirement types; the API requires it. */
  requirementType: requirementTypeEnum('requirement_type'),
  courseHours: integer('course_hours').notNull().default(1), // Course credit / weight
  /**
   * Major requirements only: the specialization whose students take it. Null on
   * majors that predate specializations; those count for the whole faculty.
   */
  specializationId: uuid('specialization_id').references(() => specializations.id),
  /**
   * Major requirements only, and only when no specialization is set: the
   * department whose students (of any of its specializations, or none) take it.
   */
  departmentId: uuid('department_id').references(() => facultyDepartments.id),
  ...timestamps(),
});

/** Faculty <-> curriculum offerings (one pair once). */
export const facultyCurriculums = pgTable(
  'faculty_curriculums',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    facultyId: uuid('faculty_id')
      .notNull()
      .references(() => faculties.id),
    curriculumId: uuid('curriculum_id')
      .notNull()
      .references(() => curriculums.id),
    /**
     * S.No. on the results sheets: 1, 2, 3... within the faculty -> year ->
     * semester, the first free number when the curriculum is placed there.
     */
    serialNo: integer('serial_no'),
    ...timestamps(),
  },
  (t) => [unique('faculty_curriculum_unique').on(t.facultyId, t.curriculumId)],
);

/** Enrolled students, identified by university number. */
export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  uniNumber: text('uni_number').notNull().unique(),
  nameEn: text('name_en').notNull(),
  nameAr: text('name_ar').notNull(),
  /** Optional; unique across students when present. */
  nationalId: text('national_id').unique(),
  /** Defaults only so rows that predate nationality get one; the API requires it. */
  nationality: nationalityEnum('nationality').notNull().default('sudanese'),
  /** Foreign students only; unique when present, like nationalId. */
  passportNumber: text('passport_number').unique(),
  acceptanceType: text('acceptance_type').notNull(),
  acceptanceYear: text('acceptance_year').notNull(),
  /** Academic year = study year 1-6. */
  academicYear: studyLevelEnum('academic_year').notNull(),
  /** Null until the year's outcome is determined. */
  status: studentResultEnum('status'),
  /** Suspended or dismissed students' grades and results are frozen until an admin lifts it. */
  standing: studentStandingEnum('standing').notNull().default('active'),
  /** Suspended students only: the academic years they sit out (1 or 2). */
  suspensionYears: integer('suspension_years'),
  facultyId: uuid('faculty_id')
    .notNull()
    .references(() => faculties.id),
  /** Optional; it decides which of the faculty's major requirements the student takes. */
  specializationId: uuid('specialization_id').references(() => specializations.id),
  /**
   * Optional, like the specialization; a student may join one in any year. When
   * the specialization sits under a department, this is always that department.
   */
  departmentId: uuid('department_id').references(() => facultyDepartments.id),
  ...timestamps(),
});

/** Per-student per-course grades (one row each). */
export const grades = pgTable(
  'grades',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    curriculumId: uuid('curriculum_id')
      .notNull()
      .references(() => curriculums.id),
    grade: numeric('grade', { precision: 5, scale: 2 }),
    /** Derived from the mark on every write, and stored so the GPA can be rebuilt from rows alone. */
    letter: letterGradeEnum('letter'),
    /** Grade points for this curriculum: the letter's points x the curriculum's course hours. */
    gp: numeric('gp', { precision: 6, scale: 2 }),
    seatingStatus: seatingStatusEnum('seating_status'),
    /** Cheating only: false until staff decide the case, and the mark is left out of the year until then. */
    cheatingResolved: boolean('cheating_resolved').notNull().default(false),
    /** The penalties staff placed on the student when deciding this cheating case, kept as a record. */
    penaltyWarning: boolean('penalty_warning').notNull().default(false),
    penaltySuspensionYears: integer('penalty_suspension_years'),
    penaltyDismissal: boolean('penalty_dismissal').notNull().default(false),
    /** A Sup & Sub re-exam mark. The original mark and letter stay as they were. */
    resitKind: resitKindEnum('resit_kind'),
    resitGrade: numeric('resit_grade', { precision: 5, scale: 2 }),
    /** The letter the resit counts as: a supplementary one is capped at C. `gp` follows it. */
    resitLetter: letterGradeEnum('resit_letter'),
    ...timestamps(),
  },
  (t) => [unique('student_curriculum_unique').on(t.studentId, t.curriculumId)],
);

/** Per-student per-semester GPA (one row each); the annual figure averages these on read. */
export const gpas = pgTable(
  'gpas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    academicYear: studyLevelEnum('academic_year').notNull(),
    semester: semesterEnum('semester').notNull(),
    /** Sum of the semester's grade points, kept so the figure can be audited. */
    gpSum: numeric('gp_sum', { precision: 7, scale: 2 }).notNull(),
    /** Course hours behind that sum; an undecided cheating case counts in neither. */
    courseHours: integer('course_hours').notNull(),
    gpa: numeric('gpa', { precision: 3, scale: 2 }).notNull(),
    status: studentStatusEnum('status'),
    ...timestamps(),
  },
  (t) => [unique('unique_gpa_student_year_semester').on(t.studentId, t.academicYear, t.semester)],
);

/**
 * A batch's results for one semester: a frozen snapshot of the sheet, as the
 * college board saw it. One per faculty -> year -> acceptance year (or all of
 * them) -> semester -> kind.
 */
export const results = pgTable(
  'results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    facultyId: uuid('faculty_id')
      .notNull()
      .references(() => faculties.id),
    academicYear: studyLevelEnum('academic_year').notNull(),
    /** Null when the result covers every student at the level, whatever their acceptance year. */
    acceptanceYear: text('acceptance_year'),
    /**
     * The specialization the result is for; null for the students without one
     * (the whole batch, in a faculty that has no specializations).
     */
    specializationId: uuid('specialization_id').references(() => specializations.id),
    /**
     * Only on a result for a department's students without a specialization;
     * null otherwise (a specialization's result names its specialization alone).
     */
    departmentId: uuid('department_id').references(() => facultyDepartments.id),
    semester: semesterEnum('semester').notNull(),
    kind: resultKindEnum('kind').notNull(),
    status: resultStatusEnum('status').notNull().default('pending'),
    /** What staff typed when generating: program, batch, academic year and the dates. */
    header: jsonb('header').$type<ResultHeader>().notNull(),
    /** The courses, students and cells, frozen at generation. */
    sheet: jsonb('sheet').$type<ResultSheet>().notNull(),
    /** Students of the batch left off this result by hand; their grades don't lock with it. */
    excludedStudentIds: jsonb('excluded_student_ids').$type<string[]>().notNull().default([]),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    unique('result_batch_unique').on(
      t.facultyId,
      t.academicYear,
      t.acceptanceYear,
      t.specializationId,
      t.departmentId,
      t.semester,
      t.kind,
    )
      // an all-acceptance-years, no-specialization or no-department result (null) is still one per batch
      .nullsNotDistinct(),
  ],
);

/** The students a result lists; an approved result locks their grades for its semester. */
export const resultStudents = pgTable(
  'result_students',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resultId: uuid('result_id')
      .notNull()
      .references(() => results.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
  },
  (t) => [unique('result_student_unique').on(t.resultId, t.studentId)],
);

// ============================================== CMS ==============================================

export const aboutPage = pgTable('about_page', {
  id: uuid().primaryKey().defaultRandom(),
  content: jsonb().$type<AboutUs>().notNull(),
  ...timestamps(),
});

export const contactUsPage = pgTable('contact_us_page', {
  id: uuid().primaryKey().defaultRandom(),
  content: jsonb().$type<ContactUs>().notNull(),
  ...timestamps(),
});

export const crewPage = pgTable('crew_page', {
  id: uuid().primaryKey().defaultRandom(),
  crewId: uuid()
    .notNull()
    .unique()
    .references(() => crews.id),
  content: jsonb().$type<CrewPage>().notNull(),
  ...timestamps(),
});

export const deanshipPage = pgTable('deanship_page', {
  id: uuid().primaryKey().defaultRandom(),
  content: jsonb().$type<DeanshipAndCenters>().notNull(),
  ...timestamps(),
});

export const imageExhibitionPage = pgTable('image_exhibition_page', {
  id: uuid().primaryKey().defaultRandom(),
  content: jsonb().$type<ImagesExhibition>().notNull(),
  ...timestamps(),
});

/** Main page website content as a single JSON document. */
export const mainPage = pgTable('main_page', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: jsonb('content').$type<MainPageContent>().notNull(),
  ...timestamps(),
});

export const partnershipPage = pgTable('partnership_page', {
  id: uuid().primaryKey().defaultRandom(),
  content: jsonb().$type<Partnerships>().notNull(),
  ...timestamps(),
});

/** Faculty sub page content, one JSON document per faculty. */
export const facultyPages = pgTable('faculty_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  facultyId: uuid('faculty_id')
    .notNull()
    .references(() => faculties.id)
    .unique(),
  content: jsonb('content').$type<FacultyPageContent>().notNull(),
  ...timestamps(),
});

export const scientificAffairsPage = pgTable('scientific_affairs_page', {
  id: uuid().primaryKey().defaultRandom(),
  content: jsonb().$type<ScientificAffairsPage>().notNull(),
  ...timestamps(),
});

// ==============================================relations=============================================================

export const crewPageRelations = relations(crewPage, ({ one }) => ({
  crew: one(crews, {
    fields: [crewPage.crewId],
    references: [crews.id],
  }),
}));

/** Relations for users: employee, departments, faculty. */
export const userRelations = relations(users, ({ many, one }) => ({
  employee: one(employees),
  usersDepartments: many(usersDepartments),
  faculty: one(faculties, {
    fields: [users.facultyId],
    references: [faculties.id],
  }),
}));

/** Relations for employees: crew, user, department, role. */
export const employeeRelations = relations(employees, ({ one }) => ({
  crew: one(crews),
  user: one(users, { fields: [employees.userId], references: [users.id] }),
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  role: one(roles, { fields: [employees.roleId], references: [roles.id] }),
}));

/** Relations for crews: owning employee. */
export const crewRelations = relations(crews, ({ one }) => ({
  crewPage: one(crewPage),
  employee: one(employees, {
    fields: [crews.employeeId],
    references: [employees.id],
  }),
}));

/** Relations for roles: employees, permission grants. */
export const roleRelations = relations(roles, ({ many }) => ({
  employees: many(employees),
  rolePermission: many(rolePermissions),
}));

/** Relations for permissions: role grants. */
export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

/** Relations for departments: employees, user memberships. */
export const departmentRelations = relations(departments, ({ many }) => ({
  employees: many(employees),
  usersDepartments: many(usersDepartments),
}));

/** Relations for user-department memberships: user, department. */
export const usersDepartmentsRelations = relations(usersDepartments, ({ one }) => ({
  user: one(users, {
    fields: [usersDepartments.userId],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [usersDepartments.departmentId],
    references: [departments.id],
  }),
}));

/** Relations for role-permission grants: role, permission. */
export const rolePermissionRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

/// academic relations

/** Relations for faculties: users, students, curriculums, page. */
export const facultiesRelations = relations(faculties, ({ many, one }) => ({
  user: one(users),
  page: one(facultyPages),
  students: many(students),
  facultyCurriculums: many(facultyCurriculums),
  specializations: many(specializations),
  departments: many(facultyDepartments),
}));

/** Relations for academic departments: faculty, specializations, students, curriculums. */
export const facultyDepartmentsRelations = relations(facultyDepartments, ({ one, many }) => ({
  faculty: one(faculties, {
    fields: [facultyDepartments.facultyId],
    references: [faculties.id],
  }),
  specializations: many(specializations),
  students: many(students),
  curriculums: many(curriculums),
}));

/** Relations for specializations: faculty, department, students, curriculums. */
export const specializationsRelations = relations(specializations, ({ one, many }) => ({
  faculty: one(faculties, {
    fields: [specializations.facultyId],
    references: [faculties.id],
  }),
  department: one(facultyDepartments, {
    fields: [specializations.departmentId],
    references: [facultyDepartments.id],
  }),
  students: many(students),
  curriculums: many(curriculums),
}));

/** Relations for curriculums: faculties, grades. */
export const curriculumsRelations = relations(curriculums, ({ many, one }) => ({
  facultyCurriculums: many(facultyCurriculums),
  grades: many(grades),
  specialization: one(specializations, {
    fields: [curriculums.specializationId],
    references: [specializations.id],
  }),
  department: one(facultyDepartments, {
    fields: [curriculums.departmentId],
    references: [facultyDepartments.id],
  }),
}));

/** Relations for faculty-curriculum links: faculty, curriculum. */
export const facultyCurriculumsRelations = relations(facultyCurriculums, ({ one }) => ({
  faculty: one(faculties, {
    fields: [facultyCurriculums.facultyId],
    references: [faculties.id],
  }),
  curriculum: one(curriculums, {
    fields: [facultyCurriculums.curriculumId],
    references: [curriculums.id],
  }),
}));

/** Relations for students: faculty, grades, GPAs. */
export const studentsRelations = relations(students, ({ one, many }) => ({
  faculty: one(faculties, {
    fields: [students.facultyId],
    references: [faculties.id],
  }),
  specialization: one(specializations, {
    fields: [students.specializationId],
    references: [specializations.id],
  }),
  department: one(facultyDepartments, {
    fields: [students.departmentId],
    references: [facultyDepartments.id],
  }),
  grades: many(grades),
  gpas: many(gpas),
}));

/** Relations for grades: student, curriculum. */
export const gradesRelations = relations(grades, ({ one }) => ({
  student: one(students, {
    fields: [grades.studentId],
    references: [students.id],
  }),
  curriculum: one(curriculums, {
    fields: [grades.curriculumId],
    references: [curriculums.id],
  }),
}));

/** Relations for GPAs: student. */
export const gpasRelations = relations(gpas, ({ one }) => ({
  student: one(students, {
    fields: [gpas.studentId],
    references: [students.id],
  }),
}));

/** Relations for results: faculty, listed students. */
export const resultsRelations = relations(results, ({ one, many }) => ({
  faculty: one(faculties, {
    fields: [results.facultyId],
    references: [faculties.id],
  }),
  students: many(resultStudents),
}));

/** Relations for a result's students: result, student. */
export const resultStudentsRelations = relations(resultStudents, ({ one }) => ({
  result: one(results, {
    fields: [resultStudents.resultId],
    references: [results.id],
  }),
  student: one(students, {
    fields: [resultStudents.studentId],
    references: [students.id],
  }),
}));

/// cms relations

/** Relations for faculty pages: faculty. */
export const facultyPagesRelations = relations(facultyPages, ({ one }) => ({
  faculty: one(faculties, {
    fields: [facultyPages.facultyId],
    references: [faculties.id],
  }),
}));
