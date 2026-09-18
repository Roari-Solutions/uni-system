import 'dotenv/config';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { config } from './config';

const PASS = 'secret123';

/** Initial faculties: English names with their codes. */
const FACULTIES = [
  { name: 'Nursing', code: 'NS' },
  { name: 'Law', code: 'LW' },
  { name: 'Information Systems', code: 'IS' },
  { name: 'Computer and Information Technology', code: 'IT' },
  { name: 'Business Studies', code: 'CS' },
];

/** Opens a Drizzle handle using the central database URL. */
function getDb() {
  return drizzle(new Pool({ connectionString: config.databaseUrl }), { schema });
}

type Db = ReturnType<typeof getDb>;

/** Ensures a faculty exists by name; fills in a missing code. */
async function ensureFaculty(
  db: Db,
  name: string,
  code: string,
): Promise<{ id: string; name: string; code: string }> {
  const found = await db.query.faculties.findFirst({
    where: eq(schema.faculties.name, name),
  });
  if (found) {
    if (!found.code) {
      await db.update(schema.faculties).set({ code }).where(eq(schema.faculties.id, found.id));
    }
    return { id: found.id, name: found.name, code: found.code ?? code };
  }
  const [row] = await db.insert(schema.faculties).values({ name, code }).returning();
  return { id: row.id, name: row.name, code: row.code ?? code };
}

/** Ensures a department exists; returns its id. */
async function ensureDepartment(db: Db, name: string): Promise<string> {
  const found = await db.query.departments.findFirst({
    where: eq(schema.departments.name, name),
  });
  if (found) return found.id;
  const [row] = await db.insert(schema.departments).values({ name }).returning();
  return row.id;
}

/** Ensures a role exists; returns its id. */
async function ensureRole(db: Db, name: string): Promise<string> {
  const found = await db.query.roles.findFirst({
    where: eq(schema.roles.name, name),
  });
  if (found) return found.id;
  const [row] = await db.insert(schema.roles).values({ name, level: '1' }).returning();
  return row.id;
}

/** Ensures a login-capable user with the given employee role; resets password. */
async function ensureUser(
  db: Db,
  email: string,
  display: string,
  roleName: string,
  facultyId: string | null,
  departmentId: string,
) {
  const hashed = await bcrypt.hash(PASS, 10);
  await db
    .insert(schema.users)
    .values({ name: display, password: hashed, email })
    .onConflictDoNothing({ target: schema.users.email });
  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });
  if (!user) throw new Error(`seed failed for ${email}`);
  await db
    .update(schema.users)
    .set({ password: hashed, facultyId, suspended: false })
    .where(eq(schema.users.id, user.id));

  const roleId = await ensureRole(db, roleName);
  const emp = await db.query.employees.findFirst({
    where: eq(schema.employees.userId, user.id),
  });
  if (!emp) {
    await db.insert(schema.employees).values({ userId: user.id, departmentId, roleId });
  } else {
    await db.update(schema.employees).set({ roleId }).where(eq(schema.employees.id, emp.id));
  }
  console.log(`user ${email} (role=${roleName}) ready`);
}

async function main() {
  const db = getDb();
  try {
    const rows = [];
    for (const f of FACULTIES) rows.push(await ensureFaculty(db, f.name, f.code));
    await ensureRole(db, 'admin');
    await ensureRole(db, 'data-entry');
    const deptId = await ensureDepartment(db, 'IT');
    await ensureUser(db, 'admin', 'Admin', 'admin', null, deptId);
    for (const f of rows) {
      await ensureUser(db, `entry-${f.code.toLowerCase()}`, `${f.name} Entry`, 'data-entry', f.id, deptId);
    }
  } finally {
    await db.$client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
