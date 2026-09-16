import { relations } from 'drizzle-orm';
import { numeric, unique } from 'drizzle-orm/pg-core';
import { integer, pgTable, pgEnum, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';

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

export const semesterEnum = pgEnum('semester', ['1', '2']);

export const studentStatusEnum = pgEnum('student_status_enum', ['pass', 'fail']);

export const roleLevelEnum = pgEnum('role_level', ['1', '2', '3', '4']);

const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const faculties = pgTable('faculties', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  ...timestamps(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  suspended: boolean('suspended').notNull().default(false),
  phone: text('phone'),
  bloodType: bloodTypeEnum('blood_type'),
  password: text('password').notNull(),
  nationalId: text('national_id').unique(),
  facultyId: uuid('faculty_id')
    .references(() => faculties.id)
    .unique(),
  pfp: text('pfp'),
  ...timestamps(),
});
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

export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  ...timestamps(),
});

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  level: roleLevelEnum('level'),
  ...timestamps(),
});

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

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  ...timestamps(),
});

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

export const crews = pgTable('crews', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  ...timestamps(),
});

export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  value: text('value').notNull(),
  iconName: text('icon_name'),
  ...timestamps(),
});

export const news = pgTable('news', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull().unique(),
  content: text('content').notNull(),
  ...timestamps(),
});
// ============================================== ACADEMIC TABLES ==============================================

export const curriculums = pgTable('curriculums', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  code: text('code').unique(),
  courseHours: integer('course_hours').notNull().default(1), // Course credit / weight
  ...timestamps(),
});

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
    ...timestamps(),
  },
  (t) => [unique('faculty_curriculum_unique').on(t.facultyId, t.curriculumId)],
);

export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  uniNumber: text('uni_number').notNull().unique(),
  name: text('name').notNull(),
  acceptanceType: text('acceptance_type').notNull(),
  acceptanceYear: integer('acceptance_year').notNull(),
  facultyId: uuid('faculty_id')
    .notNull()
    .references(() => faculties.id),
  ...timestamps(),
});

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
    academicYear: text('academic_year').notNull(),
    semester: semesterEnum('semester').notNull(),
    ...timestamps(),
  },
  (t) => [
    unique('student_curriculum_academic_year_semester_grade_unique').on(
      t.studentId,
      t.curriculumId,
      t.academicYear,
      t.semester,
    ),
  ],
);

export const results = pgTable(
  'results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    academicYear: text('academic_year').notNull(),
    semester: semesterEnum('semester').notNull(),
    result: numeric('result', { precision: 6, scale: 2 }).notNull(),
    gpa: numeric('gpa', { precision: 3, scale: 2 }).notNull(),
    status: studentStatusEnum('status'),
    ...timestamps(),
  },
  (t) => [
    unique('unique_result_student_academic_year_semester').on(
      t.studentId,
      t.academicYear,
      t.semester,
    ),
  ],
);

// ==============================================relations=============================================================

export const userRelations = relations(users, ({ many, one }) => ({
  employee: one(employees),
  usersDepartments: many(usersDepartments),
  faculty: one(faculties, {
    fields: [users.facultyId],
    references: [faculties.id],
  }),
}));

export const employeeRelations = relations(employees, ({ one }) => ({
  crew: one(crews),
  user: one(users, { fields: [employees.userId], references: [users.id] }),
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  role: one(roles, { fields: [employees.roleId], references: [roles.id] }),
}));

export const crewRelations = relations(crews, ({ one }) => ({
  employee: one(employees, {
    fields: [crews.employeeId],
    references: [employees.id],
  }),
}));

export const roleRelations = relations(roles, ({ many }) => ({
  employees: many(employees),
  rolePermission: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const departmentRelations = relations(departments, ({ many }) => ({
  employees: many(employees),
  usersDepartments: many(usersDepartments),
}));

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

export const facultiesRelations = relations(faculties, ({ many, one }) => ({
  user: one(users),
  students: many(students),
  facultyCurriculums: many(facultyCurriculums),
}));

export const curriculumsRelations = relations(curriculums, ({ many }) => ({
  facultyCurriculums: many(facultyCurriculums),
  grades: many(grades),
}));

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

export const studentsRelations = relations(students, ({ one, many }) => ({
  faculty: one(faculties, {
    fields: [students.facultyId],
    references: [faculties.id],
  }),
  grades: many(grades),
  results: many(results),
}));

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

export const resultsRelations = relations(results, ({ one }) => ({
  student: one(students, {
    fields: [results.studentId],
    references: [students.id],
  }),
}));
