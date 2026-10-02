import { and, eq, inArray } from 'drizzle-orm';
import * as schema from '../../schema';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PERMISSIONS, ROLE_GRANTS } from './permissions';

type Db = NodePgDatabase<typeof schema>;

/**
 * Makes sure every role, permission and grant in ROLE_GRANTS exists. Adds what
 * is missing and never removes anything, so a grant given by hand stays. Runs
 * on startup and from the seed scripts, so a database built with `db:push`
 * instead of the migrations still lets people sign in.
 */
export async function ensureGrants(db: Db): Promise<void> {
  const roleNames = Object.keys(ROLE_GRANTS);
  const permissionNames = Object.values(PERMISSIONS);

  await db
    .insert(schema.roles)
    .values(roleNames.map((name) => ({ name })))
    .onConflictDoNothing({ target: schema.roles.name });
  await db
    .insert(schema.permissions)
    .values(permissionNames.map((name) => ({ name })))
    .onConflictDoNothing({ target: schema.permissions.name });

  const roles = await db.query.roles.findMany({
    where: inArray(schema.roles.name, roleNames),
  });
  const permissions = await db.query.permissions.findMany({
    where: inArray(schema.permissions.name, permissionNames),
  });
  const roleId = new Map(roles.map((r) => [r.name, r.id]));
  const permissionId = new Map(permissions.map((p) => [p.name, p.id]));

  const grants = Object.entries(ROLE_GRANTS).flatMap(([role, perms]) =>
    perms.map((p) => ({
      roleId: roleId.get(role)!,
      permissionId: permissionId.get(p)!,
    })),
  );
  // role_permissions has no conflict target drizzle can name, so check first
  for (const grant of grants) {
    const found = await db.query.rolePermissions.findFirst({
      where: and(
        eq(schema.rolePermissions.roleId, grant.roleId),
        eq(schema.rolePermissions.permissionId, grant.permissionId),
      ),
    });
    if (!found) await db.insert(schema.rolePermissions).values(grant);
  }
}

/** Gives a user exactly these roles, replacing any they had. */
export async function setUserRoles(
  db: Db,
  userId: string,
  roleNames: string[],
): Promise<void> {
  const roles = await db.query.roles.findMany({
    where: inArray(schema.roles.name, roleNames),
  });
  if (roles.length !== roleNames.length)
    throw new Error(`unknown role among ${roleNames.join(', ')}`);
  await db.delete(schema.userRoles).where(eq(schema.userRoles.userId, userId));
  await db
    .insert(schema.userRoles)
    .values(roles.map((r) => ({ userId, roleId: r.id })));
}
