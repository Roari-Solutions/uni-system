import { relations } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';

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

export const roleLevelEnum = pgEnum('role_level', ['1', '2', '3', '4']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  suspended: boolean('suspended').notNull().default(false),
  phone: text('phone'),
  bloodType: bloodTypeEnum('blood_type'),
  password: text('password').notNull(),
  nationalId: text('national_id').unique(),
  pfp: text('pfp'),
  ...timestamps,
});

export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ...timestamps,
});

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  level: roleLevelEnum('level'),
  ...timestamps,
});

export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  departmentId: uuid('department_id')
    .notNull()
    .references(() => departments.id),
  roleId: uuid('role_id')
    .notNull()
    .references(() => roles.id),
  title: text('title'),
  ...timestamps,
});

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ...timestamps,
});

export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleId: uuid('role_id')
    .notNull()
    .references(() => roles.id),
  permissionId: uuid('permission_id')
    .notNull()
    .references(() => permissions.id),
});

export const crews = pgTable('crews', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  ...timestamps,
});

export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  value: text('value').notNull(),
  iconName: text('icon_name'),
  ...timestamps,
});

export const news = pgTable('news', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull().unique(),
  content: text('content').notNull(),
  ...timestamps,
});

// ==============================================relations=============================================================

export const user_relations = relations(users, ({ one }) => ({
  employee: one(employees),
}));

export const employee_relations = relations(employees, ({ one }) => ({
  crew: one(crews),
  user: one(users, { fields: [employees.userId], references: [users.id] }),
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  role: one(roles, { fields: [employees.roleId], references: [roles.id] }),
}));

export const crew_relations = relations(crews, ({ one }) => ({
  employee: one(employees, {
    fields: [crews.employeeId],
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
}));

export const role_permission_relations = relations(
  rolePermissions,
  ({ one }) => ({
    role: one(roles, {
      fields: [rolePermissions.roleId],
      references: [roles.id],
    }),
    permission: one(permissions, {
      fields: [rolePermissions.permissionId],
      references: [permissions.id],
    }),
  }),
);
