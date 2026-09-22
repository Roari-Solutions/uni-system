import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { departments, employees, roles, users } from 'schema';
import { DATABASE, type Db } from 'src/database/database.module';
import { assertFacultyExists } from 'src/gr-scope/gr-scope';
import { ADMIN_ROLE } from './admin.guard';
import {
  ASSIGNABLE_ROLES,
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

/** A user as the admin views consume them; never carries the password hash. */
export interface UserView {
  id: string;
  name: string;
  email: string;
  role: string;
  facultyId: string | null;
  phone: string | null;
  suspended: boolean;
}

/** Admin-only user management. */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /** Resolves an assignable role by name; throws BadRequest otherwise. */
  private async roleOrThrow(name: string) {
    const clean = name.trim();
    // the DTO already narrows this; the check stays so no caller can widen it
    if (!(ASSIGNABLE_ROLES as readonly string[]).includes(clean)) {
      throw new BadRequestException();
    }
    const row = await this.db.query.roles.findFirst({
      where: eq(roles.name, clean),
    });
    if (!row) throw new BadRequestException();
    return row;
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

  /** Lists the roles this dashboard may assign; the CMS role is not among them. */
  async listRoles() {
    return await this.db.query.roles.findMany({
      columns: { id: true, name: true },
      where: inArray(roles.name, [...ASSIGNABLE_ROLES]),
    });
  }

  /** Lists users with their role, narrowed by the optional filters. */
  async listUsers(query: ListUsersQueryDto = {}): Promise<UserView[]> {
    try {
      const rows = await this.db.query.users.findMany({
        where: query.facultyId ? eq(users.facultyId, query.facultyId) : undefined,
        with: {
          employee: { columns: {}, with: { role: { columns: { name: true } } } },
        },
      });

      let views = rows
        // a user without an employee row has no role and cannot sign in
        .filter((row) => row.employee?.role)
        .map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.employee!.role.name,
          facultyId: row.facultyId,
          phone: row.phone,
          suspended: row.suspended,
        }));

      if (query.role) views = views.filter((v) => v.role === query.role);
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
      throw new InternalServerErrorException('User operation failed', { cause: error });
    }
  }

  /** Creates a user plus the employee row that carries their role. */
  async createUser(dto: CreateUserDto): Promise<UserView> {
    try {
      const email = dto.email.trim();
      const existing = await this.db.query.users.findFirst({
        where: eq(users.email, email),
      });
      if (existing) throw new ConflictException();

      const role = await this.roleOrThrow(dto.role);
      const facultyId = dto.facultyId
        ? await assertFacultyExists(this.db, dto.facultyId)
        : null;
      const departmentId = await this.defaultDepartmentId();
      const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

      // both rows or neither: a user without an employee row cannot sign in
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

        await tx.insert(employees).values({
          userId: user.id,
          departmentId,
          roleId: role.id,
        });

        return user;
      });

      this.logger.log(`Created user ${email} (role: ${role.name})`);
      return {
        id: created.id,
        name: created.name,
        email: created.email,
        role: role.name,
        facultyId: created.facultyId,
        phone: created.phone,
        suspended: created.suspended,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error('Failed to create user', error);
      throw new InternalServerErrorException('User operation failed', { cause: error });
    }
  }

  /**
   * Updates a user. An admin may not change their own role or suspend
   * themselves: with one admin account that would lock everyone out.
   */
  async updateUser(id: string, dto: UpdateUserDto, callerId: string): Promise<UserView> {
    if (!dto || !Object.keys(dto).length) throw new BadRequestException();
    try {
      const row = await this.db.query.users.findFirst({
        where: eq(users.id, id),
        with: {
          employee: { with: { role: { columns: { id: true, name: true } } } },
        },
      });
      if (!row?.employee) throw new NotFoundException();

      const isSelf = row.id === callerId;
      if (isSelf && dto.role !== undefined && dto.role !== row.employee.role.name) {
        throw new BadRequestException({ code: 'SELF_ROLE_CHANGE' });
      }
      if (isSelf && dto.suspended === true) {
        throw new BadRequestException({ code: 'SELF_SUSPEND' });
      }

      if (dto.email !== undefined && dto.email.trim() !== row.email) {
        const clash = await this.db.query.users.findFirst({
          where: eq(users.email, dto.email.trim()),
        });
        if (clash) throw new ConflictException();
      }

      let facultyId = row.facultyId;
      if (dto.facultyId !== undefined) {
        facultyId = dto.facultyId ? await assertFacultyExists(this.db, dto.facultyId) : null;
      }

      let roleName = row.employee.role.name;
      if (dto.role !== undefined && dto.role !== roleName) {
        const role = await this.roleOrThrow(dto.role);
        await this.db
          .update(employees)
          .set({ roleId: role.id })
          .where(eq(employees.id, row.employee.id));
        roleName = role.name;
      }

      const [updated] = await this.db
        .update(users)
        .set({
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.email !== undefined ? { email: dto.email.trim() } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
          ...(dto.suspended !== undefined ? { suspended: dto.suspended } : {}),
          facultyId,
        })
        .where(eq(users.id, row.id))
        .returning();

      this.logger.log(`Updated user ${updated.email}`);
      return {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: roleName,
        facultyId: updated.facultyId,
        phone: updated.phone,
        suspended: updated.suspended,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(`Failed to update user: ${id}`, error);
      throw new InternalServerErrorException('User operation failed', { cause: error });
    }
  }

  /** Sets a new password. The admin communicates it to the user themselves. */
  async resetPassword(id: string, password: string): Promise<{ status: string }> {
    try {
      const row = await this.db.query.users.findFirst({
        where: eq(users.id, id),
        columns: { id: true, email: true },
      });
      if (!row) throw new NotFoundException();

      await this.db
        .update(users)
        .set({ password: await bcrypt.hash(password, BCRYPT_ROUNDS) })
        .where(eq(users.id, row.id));

      this.logger.log(`Password reset for ${row.email}`);
      return { status: 'Ok' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to reset password: ${id}`, error);
      throw new InternalServerErrorException('User operation failed', { cause: error });
    }
  }

  /** True when the given user is the only active admin left. */
  async isLastAdmin(userId: string): Promise<boolean> {
    const admins = await this.db.query.employees.findMany({
      with: {
        role: { columns: { name: true } },
        user: { columns: { id: true, suspended: true } },
      },
    });
    const active = admins.filter(
      (e) => e.role.name === ADMIN_ROLE && !e.user.suspended,
    );
    return active.length === 1 && active[0].user.id === userId;
  }
}
