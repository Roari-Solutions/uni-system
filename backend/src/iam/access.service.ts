import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { users } from 'schema';
import { DATABASE, type Db } from 'src/database/database.module';
import { portalsFor } from './portals';

/** Who the caller is and what they may do, as of this request. */
export interface Access {
  userId: string;
  facultyId: string | null;
  roles: string[];
  permissions: ReadonlySet<string>;
}

/** How long a loaded access stays fresh; a removed role stops working within this. */
const TTL_MS = 10_000;

/**
 * Loads a user's roles and permissions from the database. Tokens carry only the
 * user's id, so a role granted or removed takes effect without signing in again.
 */
@Injectable()
export class AccessService {
  private readonly cache = new Map<
    string,
    { access: Access | null; at: number }
  >();

  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /** The user's access, or null when they don't exist or are suspended. */
  async load(userId: string): Promise<Access | null> {
    const hit = this.cache.get(userId);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.access;

    const row = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, facultyId: true, suspended: true },
      with: {
        userRoles: {
          columns: {},
          with: {
            role: {
              columns: { name: true },
              with: {
                rolePermission: {
                  columns: {},
                  with: { permission: { columns: { name: true } } },
                },
              },
            },
          },
        },
      },
    });

    const access: Access | null =
      row && !row.suspended
        ? {
            userId: row.id,
            facultyId: row.facultyId,
            roles: row.userRoles.map((ur) => ur.role.name).sort(),
            permissions: new Set(
              row.userRoles.flatMap((ur) =>
                ur.role.rolePermission.map((rp) => rp.permission.name),
              ),
            ),
          }
        : null;

    this.cache.set(userId, { access, at: Date.now() });
    return access;
  }

  /** Drops a user's cached access, after their roles, faculty or suspension change. */
  forget(userId: string): void {
    this.cache.delete(userId);
  }

  /** The portals a user may open; empty for a user who may open none. */
  portalsOf(access: Access) {
    return portalsFor(access.permissions);
  }
}
