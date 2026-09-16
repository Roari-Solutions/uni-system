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
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
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
  blood_type: bloodTypeEnum('blood_type'),
  password: text('password').notNull(),
  national_id: text('national_id').unique(),
  faculty_id: uuid('faculty_id')
    .references(() => faculties.id)
    .unique(),
  pfp: text('pfp'),
  ...timestamps(),
});
export const users_departments = pgTable(
  'users_departments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    department_id: uuid('department_id')
      .references(() => departments.id)
      .notNull(),
    ...timestamps(),
  },
  (t) => [unique('user_department').on(t.user_id, t.department_id)],
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
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id)
    .unique(),
  department_id: uuid('department_id')
    .notNull()
    .references(() => departments.id),
  role_id: uuid('role_id')
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
    role_id: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    permission_id: uuid('permission_id')
      .notNull()
      .references(() => permissions.id),
  },
  (t) => [unique('role_premission').on(t.permission_id, t.role_id)],
);

export const crews = pgTable('crews', {
  id: uuid('id').primaryKey().defaultRandom(),
  employee_id: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  ...timestamps(),
});

export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  value: text('value').notNull(),
  icon_name: text('icon_name'),
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
  course_hours: integer('course_hours').notNull().default(1), // Course credit / weight
  ...timestamps(),
});

export const faculty_curriculums = pgTable(
  'faculty_curriculums',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    faculty_id: uuid('faculty_id')
      .notNull()
      .references(() => faculties.id),
    curriculum_id: uuid('curriculum_id')
      .notNull()
      .references(() => curriculums.id),
    ...timestamps(),
  },
  (t) => [unique('faculty_curriculum_unique').on(t.faculty_id, t.curriculum_id)],
);

export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  uni_number: text('uni_number').notNull().unique(),
  name: text('name').notNull(),
  acceptance_type: text('acceptance_type').notNull(),
  acceptance_year: integer('acceptance_year').notNull(),
  faculty_id: uuid('faculty_id')
    .notNull()
    .references(() => faculties.id),
  ...timestamps(),
});

export const grades = pgTable(
  'grades',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    student_id: uuid('student_id')
      .notNull()
      .references(() => students.id),
    curriculum_id: uuid('curriculum_id')
      .notNull()
      .references(() => curriculums.id),
    grade: numeric('grade', { precision: 5, scale: 2 }),
    academic_year: text('academic_year').notNull(),
    semester: semesterEnum('semester').notNull(),
    ...timestamps(),
  },
  (t) => [
    unique('student_curriculum_academic_year_semester_grade_unique').on(
      t.student_id,
      t.curriculum_id,
      t.academic_year,
      t.semester,
    ),
  ],
);

export const results = pgTable(
  'results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    student_id: uuid('student_id')
      .notNull()
      .references(() => students.id),
    academic_year: text('academic_year').notNull(),
    semester: semesterEnum('semester').notNull(),
    result: numeric('result', { precision: 6, scale: 2 }).notNull(),
    gpa: numeric('gpa', { precision: 3, scale: 2 }).notNull(),
    status: studentStatusEnum('status'),
    ...timestamps(),
  },
  (t) => [
    unique('unique_result_student_academic_year_semester').on(
      t.student_id,
      t.academic_year,
      t.semester,
    ),
  ],
);

// ==============================================relations=============================================================

export const user_relations = relations(users, ({ many, one }) => ({
  employee: one(employees),
  users_departments: many(users_departments),
  faculty: one(faculties, {
    fields: [users.faculty_id],
    references: [faculties.id],
  }),
}));

export const employee_relations = relations(employees, ({ one }) => ({
  crew: one(crews),
  user: one(users, { fields: [employees.user_id], references: [users.id] }),
  department: one(departments, {
    fields: [employees.department_id],
    references: [departments.id],
  }),
  role: one(roles, { fields: [employees.role_id], references: [roles.id] }),
}));

export const crew_relations = relations(crews, ({ one }) => ({
  employee: one(employees, {
    fields: [crews.employee_id],
    references: [employees.id],
  }),
}));

export const role_relations = relations(roles, ({ many }) => ({
  employees: many(employees),
  rolePermission: many(rolePermissions),
}));

export const permissions_relations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const department_relations = relations(departments, ({ many }) => ({
  employees: many(employees),
  users_departments: many(users_departments),
}));

export const users_departments_relations = relations(users_departments, ({ one }) => ({
  user: one(users, {
    fields: [users_departments.user_id],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [users_departments.department_id],
    references: [departments.id],
  }),
}));

export const role_permission_relations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.role_id],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permission_id],
    references: [permissions.id],
  }),
}));

/// academic relations

export const faculties_relations = relations(faculties, ({ many, one }) => ({
  user: one(users),
  students: many(students),
  facultyCurriculums: many(faculty_curriculums),
}));

export const curriculums_relations = relations(curriculums, ({ many }) => ({
  facultyCurriculums: many(faculty_curriculums),
  grades: many(grades),
}));

export const faculty_curriculums_relations = relations(faculty_curriculums, ({ one }) => ({
  faculty: one(faculties, {
    fields: [faculty_curriculums.faculty_id],
    references: [faculties.id],
  }),
  curriculum: one(curriculums, {
    fields: [faculty_curriculums.curriculum_id],
    references: [curriculums.id],
  }),
}));

export const students_relations = relations(students, ({ one, many }) => ({
  faculty: one(faculties, {
    fields: [students.faculty_id],
    references: [faculties.id],
  }),
  grades: many(grades),
  results: many(results),
}));

export const grades_relations = relations(grades, ({ one }) => ({
  student: one(students, {
    fields: [grades.student_id],
    references: [students.id],
  }),
  curriculum: one(curriculums, {
    fields: [grades.curriculum_id],
    references: [curriculums.id],
  }),
}));

export const results_relations = relations(results, ({ one }) => ({
  student: one(students, {
    fields: [results.student_id],
    references: [students.id],
  }),
}));
