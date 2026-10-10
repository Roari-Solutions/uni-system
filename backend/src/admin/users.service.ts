import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { departments, employees, roles, userRoles, users } from 'schema';
import { DATABASE, type Db } from 'src/database/database.module';
import { assertFacultyExists } from 'src/gr-scope/gr-scope';
import { AccessService } from 'src/iam/access.service';
import { ALL_ROLES } from 'src/iam/permissions';
import {
  CreateUserDto,
  ListUsersQueryDto,
  UpdateUserDto,
} from './dto/users.dto';

/**
 * Every admin-created user lands in this department. `employees.department_id`
 * is NOT NULL and this is the only department that exists; when a second one
 * appears, the create form needs a picker instead.
 */
export const DEFAULT_DEPARTMENT = 'IT';

const BCRYPT_ROUNDS = 10;

/**
 * Who is managing users, and how far they reach: the roles they see on others
 * and the roles they may grant or remove (from userScopeOf).
 */
export interface Manager {
  userId: string;
  sees: ReadonlySet<string>;
  assigns: ReadonlySet<string>;
}

/** A user as the admin views consume them; never carries the password hash. */
export interface UserView {
  id: string;
  name: string;
  email: string;
  /** Only the roles the manager can see; roles in other domains are left out. */
  roles: string[];
  facultyId: string | null;
  phone: string | null;
  suspended: boolean;
  /** The manager may change this user's roles (all the roles they see are theirs to grant). */
  canEditRoles: boolean;
  /** The manager may change the account itself: every role it holds is theirs to grant. */
  canEditAccount: boolean;
}

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

type UserRow = typeof users.$inferSelect & { roleNames: string[] };

/** User management, scoped to the manager's domain. */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Db,
    @Inject(AccessService) private readonly accessService: AccessService,
  ) {}

  /** The user as this manager sees them, with what they may do to them. */
  private view(row: UserRow, manager: Manager): UserView {
    const visible = row.roleNames.filter((r) => manager.sees.has(r)).sort();
    const isSelf = row.id === manager.userId;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      roles: visible,
      facultyId: row.facultyId,
      phone: row.phone,
      suspended: row.suspended,
      canEditRoles: !isSelf && visible.every((r) => manager.assigns.has(r)),
      canEditAccount: row.roleNames.every((r) => manager.assigns.has(r)),
    };
  }

  /** A user and all their roles; 404 when they hold no role this manager can see. */
  private async userOrThrow(id: string, manager: Manager): Promise<UserRow> {
    const row = await this.db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        userRoles: { columns: {}, with: { role: { columns: { name: true } } } },
      },
    });
    if (!row) throw new NotFoundException();
    const { userRoles: held, ...user } = row;
    const roleNames = held.map((ur) => ur.role.name);
    // a user in another domain is not this manager's to see, let alone change
    if (!roleNames.some((r) => manager.sees.has(r)))
      throw new NotFoundException();
    return { ...user, roleNames };
  }

  /** Resolves role names to rows; every one must exist. */
  private async roleRows(names: readonly string[]) {
    const clean = [...new Set(names)];
    if (!clean.length) return [];
    const rows = await this.db.query.roles.findMany({
      where: inArray(roles.name, clean),
    });
    if (rows.length !== clean.length) throw new BadRequestException();
    return rows;
  }

  /** Refuses roles this manager may not grant. */
  private assertAssignable(names: readonly string[], manager: Manager) {
    if (names.some((n) => !manager.assigns.has(n))) {
      this.logger.warn(
        `User ${manager.userId} may not grant ${names.join(', ')}`,
      );
      throw new ForbiddenException({ code: 'ROLE_NOT_YOURS' });
    }
  }

  /** Resolves the default department, creating it if it has gone missing. */
  private async defaultDepartmentId(): Promise<string> {
    const found = await this.db.query.departments.findFirst({
      where: eq(departments.name, DEFAULT_DEPARTMENT),
    });
    if (found) return found.id;

    const [created] = await this.db
      .insert(departments)
      .values({ name: DEFAULT_DEPARTMENT })
      .returning();
    return created.id;
  }

  /** Replaces a user's roles with exactly these. */
  private async setRoles(tx: Tx, userId: string, roleIds: string[]) {
    await tx.delete(userRoles).where(eq(userRoles.userId, userId));
    if (roleIds.length) {
      await tx
        .insert(userRoles)
        .values(roleIds.map((roleId) => ({ userId, roleId })));
    }
  }

  /** The roles this manager sees, and which of them they may grant. */
  async listRoles(manager: Manager) {
    const rows = await this.db.query.roles.findMany({
      columns: { id: true, name: true },
      where: inArray(roles.name, [...manager.sees]),
    });
    // in a stable order: the order roles are declared in
    return rows
      .sort(
        (a, b) =>
          ALL_ROLES.indexOf(a.name as never) -
          ALL_ROLES.indexOf(b.name as never),
      )
      .map((r) => ({ ...r, assignable: manager.assigns.has(r.name) }));
  }

  /** The users who hold a role this manager can see, narrowed by the optional filters. */
  async listUsers(
    query: ListUsersQueryDto = {},
    manager: Manager,
  ): Promise<UserView[]> {
    try {
      const rows = await this.db.query.users.findMany({
        where: query.facultyId
          ? eq(users.facultyId, query.facultyId)
          : undefined,
        with: {
          userRoles: {
            columns: {},
            with: { role: { columns: { name: true } } },
          },
        },
      });

      let views = rows
        .map(({ userRoles: held, ...user }) => ({
          ...user,
          roleNames: held.map((ur) => ur.role.name),
        }))
        // users in other domains (or with no role at all) aren't this manager's
        .filter((row) => row.roleNames.some((r) => manager.sees.has(r)))
        .map((row) => this.view(row, manager));

      if (query.role)
        views = views.filter((v) => v.roles.includes(query.role!));
      if (query.q?.trim()) {
        const needle = query.q.trim().toLowerCase();
        views = views.filter(
          (v) =>
            v.name.toLowerCase().includes(needle) ||
            v.email.toLowerCase().includes(needle),
        );
      }

      return views;
    } catch (error) {
      this.logger.error('Failed to list users', error);
      throw new InternalServerErrorException('User operation failed', {
        cause: error,
      });
    }
  }

  /** Creates a user, the employee row behind them, and their roles. */
  async createUser(dto: CreateUserDto, manager: Manager): Promise<UserView> {
    this.assertAssignable(dto.roles, manager);
    try {
      const email = dto.email.trim();
      const existing = await this.db.query.users.findFirst({
        where: eq(users.email, email),
      });
      if (existing) throw new ConflictException();

      const roleRows = await this.roleRows(dto.roles);
      if (!roleRows.length) throw new BadRequestException();
      const facultyId = dto.facultyId
        ? await assertFacultyExists(this.db, dto.facultyId)
        : null;
      const departmentId = await this.defaultDepartmentId();
      const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

      // all rows or none: a user without roles cannot sign in
      const created = await this.db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            name: dto.name.trim(),
            email,
            password,
            facultyId,
            phone: dto.phone?.trim() || null,
          })
          .returning();

        await tx.insert(employees).values({ userId: user.id, departmentId });
        await this.setRoles(
          tx,
          user.id,
          roleRows.map((r) => r.id),
        );

        return user;
      });

      const roleNames = roleRows.map((r) => r.name);
      this.logger.log(`Created user ${email} (roles: ${roleNames.join(', ')})`);
      return this.view({ ...created, roleNames }, manager);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error('Failed to create user', error);
      throw new InternalServerErrorException('User operation failed', {
        cause: error,
      });
    }
  }

  /**
   * Updates a user. `roles` replaces only the roles within the manager's reach;
   * the user's roles in other domains are kept. The account itself (name,
   * login, phone, suspension) may be changed only by a manager who could grant
   * every role it holds. No one changes their own roles or suspends themselves:
   * with one admin account that would lock everyone out.
   */
  async updateUser(
    id: string,
    dto: UpdateUserDto,
    manager: Manager,
  ): Promise<UserView> {
    if (!dto || !Object.keys(dto).length) throw new BadRequestException();
    const row = await this.userOrThrow(id, manager);
    const current = this.view(row, manager);
    const isSelf = row.id === manager.userId;

    let nextRoles = row.roleNames;
    if (dto.roles !== undefined) {
      if (isSelf) throw new BadRequestException({ code: 'SELF_ROLE_CHANGE' });
      if (!current.canEditRoles)
        throw new ForbiddenException({ code: 'ROLE_NOT_YOURS' });
      this.assertAssignable(dto.roles, manager);
      // the roles the manager can't touch stay as they are
      nextRoles = [
        ...row.roleNames.filter((r) => !manager.assigns.has(r)),
        ...new Set(dto.roles),
      ];
      if (!nextRoles.length)
        throw new BadRequestException({ code: 'ROLE_REQUIRED' });
    }

    const accountChange = ['name', 'email', 'phone', 'suspended'].some(
      (k) => dto[k as keyof UpdateUserDto] !== undefined,
    );
    if (accountChange && !current.canEditAccount) {
      throw new ForbiddenException({ code: 'ACCOUNT_NOT_YOURS' });
    }
    // the faculty belongs to the grades roles, so whoever manages those may set it
    if (dto.facultyId !== undefined && !current.canEditRoles) {
      throw new ForbiddenException({ code: 'ROLE_NOT_YOURS' });
    }
    if (isSelf && dto.suspended === true) {
      throw new BadRequestException({ code: 'SELF_SUSPEND' });
    }

    try {
      if (dto.email !== undefined && dto.email.trim() !== row.email) {
        const clash = await this.db.query.users.findFirst({
          where: eq(users.email, dto.email.trim()),
        });
        if (clash) throw new ConflictException();
      }

      let facultyId = row.facultyId;
      if (dto.facultyId !== undefined) {
        facultyId = dto.facultyId
          ? await assertFacultyExists(this.db, dto.facultyId)
          : null;
      }

      const roleRows =
        dto.roles !== undefined ? await this.roleRows(nextRoles) : null;

      const updated = await this.db.transaction(async (tx) => {
        if (roleRows) {
          await this.setRoles(
            tx,
            row.id,
            roleRows.map((r) => r.id),
          );
        }
        const [user] = await tx
          .update(users)
          .set({
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.email !== undefined ? { email: dto.email.trim() } : {}),
            ...(dto.phone !== undefined
              ? { phone: dto.phone.trim() || null }
              : {}),
            ...(dto.suspended !== undefined
              ? { suspended: dto.suspended }
              : {}),
            facultyId,
          })
          .where(eq(users.id, row.id))
          .returning();
        return user;
      });

      // their roles, faculty or suspension may have changed: re-read on the next request
      this.accessService.forget(row.id);

      this.logger.log(`Updated user ${updated.email}`);
      return this.view({ ...updated, roleNames: nextRoles }, manager);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(`Failed to update user: ${id}`, error);
      throw new InternalServerErrorException('User operation failed', {
        cause: error,
      });
    }
  }

  /**
   * Adds one role the manager may grant to the user who signs in with this
   * login, keeping every role they hold. The user need not be in the manager's
   * domain yet; afterwards they are. Granting a role they hold already is a no-op.
   */
  async grantRole(
    login: string,
    role: string,
    manager: Manager,
  ): Promise<UserView> {
    this.assertAssignable([role], manager);
    const row = await this.db.query.users.findFirst({
      where: eq(users.email, login.trim()),
      with: {
        userRoles: { columns: {}, with: { role: { columns: { name: true } } } },
      },
    });
    if (!row) throw new NotFoundException();
    const { userRoles: held, ...user } = row;
    const roleNames = held.map((ur) => ur.role.name);
    if (user.id === manager.userId)
      throw new BadRequestException({ code: 'SELF_ROLE_CHANGE' });

    if (!roleNames.includes(role)) {
      const [roleRow] = await this.roleRows([role]);
      await this.db
        .insert(userRoles)
        .values({ userId: user.id, roleId: roleRow.id });
      roleNames.push(role);
      this.accessService.forget(user.id);
      this.logger.log(`Granted ${role} to ${user.email}`);
    }
    return this.view({ ...user, roleNames }, manager);
  }

  /** Sets a new password. The admin communicates it to the user themselves. */
  async resetPassword(
    id: string,
    password: string,
    manager: Manager,
  ): Promise<{ status: string }> {
    const row = await this.userOrThrow(id, manager);
    if (!this.view(row, manager).canEditAccount) {
      throw new ForbiddenException({ code: 'ACCOUNT_NOT_YOURS' });
    }
    try {
      await this.db
        .update(users)
        .set({ password: await bcrypt.hash(password, BCRYPT_ROUNDS) })
        .where(eq(users.id, row.id));

      this.logger.log(`Password reset for ${row.email}`);
      return { status: 'Ok' };
    } catch (error) {
      this.logger.error(`Failed to reset password: ${id}`, error);
      throw new InternalServerErrorException('User operation failed', {
        cause: error,
      });
    }
  }
}
