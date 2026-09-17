import 'dotenv/config';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { config } from './config';

const PASS = 'secret123';

/** Opens a Drizzle handle using the central database URL. */
function getDb() {
  return drizzle(new Pool({ connectionString: config.databaseUrl }), { schema });
}

/** Ensures a faculty exists by name; returns it. */
async function ensureFaculty(db: ReturnType<typeof getDb>, name: string) {
  const found = await db.query.faculties.findFirst({
    where: eq(schema.faculties.name, name),
  });
  if (found) return found;
  const [row] = await db.insert(schema.faculties).values({ name }).returning();
  return row;
}

/** Ensures a department exists; returns its id. */
async function ensureDepartment(db: ReturnType<typeof getDb>, name: string) {
  const found = await db.query.departments.findFirst({
    where: eq(schema.departments.name, name),
  });
  if (found) return found.id;
  const [row] = await db.insert(schema.departments).values({ name }).returning();
  return row.id;
}

/** Ensures a role exists; returns its id. */
async function ensureRole(db: ReturnType<typeof getDb>, name: string) {
  const found = await db.query.roles.findFirst({
    where: eq(schema.roles.name, name),
  });
  if (found) return found.id;
  const [row] = await db.insert(schema.roles).values({ name, level: '1' }).returning();
  return row.id;
}
/** Ensures a login-capable user with the given employee role; resets password. */
async function ensureGrUser(
  db: ReturnType<typeof getDb>,
  name: string,
  roleName: string,
  facultyId: string | null,
  departmentId: string,
) {
  const hashed = await bcrypt.hash(PASS, 10);
  await db
    .insert(schema.users)
    .values({ name, password: hashed, email: `test-${name}` })
    .onConflictDoNothing({ target: schema.users.email });
  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, `test-${name}`),
  });
  if (!user) throw new Error(`seed failed for test-${name}`);
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

  console.log(`user test-${name} (role=${roleName}) ready`);
}

async function main() {
  const db = getDb();
  try {
    const eng = await ensureFaculty(db, 'Engineering');
    await ensureFaculty(db, 'Medicine');
    await ensureRole(db, 'admin');
    await ensureRole(db, 'data-entry');
    const deptId = await ensureDepartment(db, 'IT');
    await ensureGrUser(db, 'admin', 'admin', null, deptId);
    await ensureGrUser(db, 'entry', 'data-entry', eng.id, deptId);
  } finally {
    await db.$client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
