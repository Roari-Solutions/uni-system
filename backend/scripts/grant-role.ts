/**
 * Gives an existing user one more role, by login. The way to make the first
 * super admin, who can then manage everyone else from the dashboard:
 *
 *   bun run grant-role <login> super-admin
 *
 * Roles: admin, data-entry, cms-admin, site-content-employee, super-admin.
 */
import 'dotenv/config';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema';
import { config } from '../config';
import { ensureGrants } from '../src/iam/grants';
import { ALL_ROLES } from '../src/iam/permissions';

async function main() {
  const [login, role] = process.argv.slice(2);
  if (!login || !role || !(ALL_ROLES as string[]).includes(role)) {
    throw new Error(
      `usage: bun run grant-role <login> <${ALL_ROLES.join('|')}>`,
    );
  }

  const pool = new Pool({ connectionString: config.databaseUrl });
  const db = drizzle(pool, { schema });
  try {
    await ensureGrants(db);
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, login),
    });
    if (!user) throw new Error(`no user signs in as "${login}"`);
    const roleRow = await db.query.roles.findFirst({
      where: eq(schema.roles.name, role),
    });
    if (!roleRow) throw new Error(`role ${role} is missing`);

    const held = await db.query.userRoles.findFirst({
      where: and(
        eq(schema.userRoles.userId, user.id),
        eq(schema.userRoles.roleId, roleRow.id),
      ),
    });
    if (held) {
      console.log(`${login} already holds ${role}`);
    } else {
      await db
        .insert(schema.userRoles)
        .values({ userId: user.id, roleId: roleRow.id });
      console.log(`${login} now holds ${role}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
