import 'dotenv/config';
import { and, eq, or } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { ensureGrants, setUserRoles } from './src/iam/grants';
import { config } from './config';

const PASS = 'secret123';

/**
 * The university's faculties, in both UI languages. This array is the source of
 * truth: re-running the seed reconciles existing rows to match it.
 */
const FACULTIES = [
  { nameEn: 'Engineering', nameAr: 'الهندسة', abbreviation: 'EN' },
  { nameEn: 'Architecture', nameAr: 'العمارة', abbreviation: 'AR' },
  { nameEn: 'Nursing Sciences', nameAr: 'علوم التمريض', abbreviation: 'NS' },
  { nameEn: 'Law', nameAr: 'القانون', abbreviation: 'LW' },
  { nameEn: 'Information Systems', nameAr: 'نظم المعلومات', abbreviation: 'IS' },
  {
    nameEn: 'Computer Science and Information Technology',
    nameAr: 'علوم الحاسوب وتقانة المعلومات',
    abbreviation: 'IT',
  },
  { nameEn: 'Business Studies', nameAr: 'الدراسات التجارية', abbreviation: 'CS' },
];

/**
 * Each faculty's departments, keyed by the faculty's abbreviation. Like
 * FACULTIES this is the source of truth: re-running the seed creates what's
 * missing and corrects names that drifted. Nothing is ever deleted here.
 */
const DEPARTMENTS: Record<string, { nameEn: string; nameAr: string }[]> = {
  EN: [
    { nameEn: 'Civil Engineering', nameAr: 'الهندسة المدنية' },
    { nameEn: 'Electrical Engineering', nameAr: 'هندسة الكهرباء' },
  ],
};

/**
 * Each faculty's specializations, keyed by the faculty's abbreviation, in both
 * languages (both are required: the English name prints on the results). Like
 * FACULTIES this is the source of truth: re-running the seed creates what's
 * missing and corrects names that drifted. Nothing is ever deleted here.
 * `departmentAr` names one of DEPARTMENTS above; null sits directly under
 * the faculty.
 */
const SPECIALIZATIONS: Record<
  string,
  { departmentAr: string | null; nameEn: string; nameAr: string }[]
> = {
  EN: [
    {
      departmentAr: 'الهندسة المدنية',
      nameEn: 'B.Tech in Civil Engineering',
      nameAr: 'البكالريوس التكنولوجى فى الهندسة المدنية',
    },
    { departmentAr: 'هندسة الكهرباء', nameEn: 'Control', nameAr: 'تحكم' },
    { departmentAr: 'هندسة الكهرباء', nameEn: 'Power', nameAr: 'قدرة' },
    { departmentAr: 'هندسة الكهرباء', nameEn: 'Communications', nameAr: 'اتصالات' },
    {
      departmentAr: 'هندسة الكهرباء',
      nameEn: 'Electronics and Computer',
      nameAr: 'الكترونيات وحاسوب',
    },
  ],
  AR: [],
  NS: [],
  LW: [],
  IS: [
    { departmentAr: null, nameEn: 'Accounting', nameAr: 'المحاسبية' },
    { departmentAr: null, nameEn: 'Management', nameAr: 'الإدارية' },
    { departmentAr: null, nameEn: 'Banking', nameAr: 'المصرفية' },
  ],
  IT: [{ departmentAr: null, nameEn: 'Information Technology', nameAr: 'تقانة المعلومات' }],
  CS: [],
};

/** Opens a Drizzle handle using the central database URL. */
function getDb() {
  return drizzle(new Pool({ connectionString: config.databaseUrl }), { schema });
}

type Db = ReturnType<typeof getDb>;

/** Ensures a faculty exists, keeping its names in step with FACULTIES. */
async function ensureFaculty(
  db: Db,
  nameEn: string,
  nameAr: string,
  abbreviation: string,
): Promise<{ id: string; nameEn: string; abbreviation: string }> {
  const found = await db.query.faculties.findFirst({
    where: eq(schema.faculties.abbreviation, abbreviation),
  });
  if (found) {
    // this file is authoritative, so correct anything that has drifted
    if (found.nameEn !== nameEn || found.nameAr !== nameAr) {
      await db
        .update(schema.faculties)
        .set({ nameEn, nameAr })
        .where(eq(schema.faculties.id, found.id));
      console.log(`faculty ${abbreviation} names updated`);
    }
    return { id: found.id, nameEn, abbreviation };
  }
  const [row] = await db
    .insert(schema.faculties)
    .values({ nameEn, nameAr, abbreviation })
    .returning();
  console.log(`faculty ${abbreviation} created`);
  return { id: row.id, nameEn: row.nameEn, abbreviation };
}

/**
 * Ensures a faculty's department exists. It is found by either name, so
 * correcting one of the two names here renames the existing row.
 */
async function ensureFacultyDepartment(
  db: Db,
  facultyId: string,
  nameEn: string,
  nameAr: string,
): Promise<string> {
  const found = await db.query.facultyDepartments.findFirst({
    where: and(
      eq(schema.facultyDepartments.facultyId, facultyId),
      or(
        eq(schema.facultyDepartments.nameEn, nameEn),
        eq(schema.facultyDepartments.nameAr, nameAr),
      ),
    ),
  });
  if (found) {
    if (found.nameEn !== nameEn || found.nameAr !== nameAr) {
      await db
        .update(schema.facultyDepartments)
        .set({ nameEn, nameAr })
        .where(eq(schema.facultyDepartments.id, found.id));
      console.log(`department ${nameEn} names updated`);
    }
    return found.id;
  }
  const [row] = await db
    .insert(schema.facultyDepartments)
    .values({ facultyId, nameEn, nameAr })
    .returning();
  console.log(`department ${nameEn} created`);
  return row.id;
}

/**
 * Ensures a faculty's specialization exists. It is found by either name, so
 * correcting one of the two names here renames the existing row.
 */
async function ensureSpecialization(
  db: Db,
  facultyId: string,
  nameEn: string,
  nameAr: string,
  departmentId: string | null,
): Promise<void> {
  const found = await db.query.specializations.findFirst({
    where: and(
      eq(schema.specializations.facultyId, facultyId),
      or(eq(schema.specializations.nameEn, nameEn), eq(schema.specializations.nameAr, nameAr)),
    ),
  });
  if (found) {
    if (
      found.nameEn !== nameEn ||
      found.nameAr !== nameAr ||
      found.departmentId !== departmentId
    ) {
      await db
        .update(schema.specializations)
        .set({ nameEn, nameAr, departmentId })
        .where(eq(schema.specializations.id, found.id));
      console.log(`specialization ${nameEn} updated`);
    }
    return;
  }
  await db.insert(schema.specializations).values({ facultyId, nameEn, nameAr, departmentId });
  console.log(`specialization ${nameEn} created`);
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

  await ensureRole(db, roleName);
  const emp = await db.query.employees.findFirst({
    where: eq(schema.employees.userId, user.id),
  });
  if (!emp) await db.insert(schema.employees).values({ userId: user.id, departmentId });
  await ensureGrants(db);
  await setUserRoles(db, user.id, [roleName]);
  console.log(`user ${email} (role=${roleName}) ready`);
}

async function main() {
  const db = getDb();
  try {
    const rows = [];
    for (const f of FACULTIES) {
      const faculty = await ensureFaculty(db, f.nameEn, f.nameAr, f.abbreviation);
      rows.push(faculty);
      const deptIds = new Map<string, string>();
      for (const dept of DEPARTMENTS[f.abbreviation] ?? []) {
        deptIds.set(
          dept.nameAr,
          await ensureFacultyDepartment(db, faculty.id, dept.nameEn, dept.nameAr),
        );
      }
      for (const spec of SPECIALIZATIONS[f.abbreviation] ?? []) {
        const departmentId = spec.departmentAr ? (deptIds.get(spec.departmentAr) ?? null) : null;
        await ensureSpecialization(db, faculty.id, spec.nameEn, spec.nameAr, departmentId);
      }
    }
    await ensureRole(db, 'admin');
    await ensureRole(db, 'data-entry');
    await ensureRole(db, 'site-content-employee');
    await ensureRole(db, 'cms-admin');
    await ensureRole(db, 'super-admin');
    const deptId = await ensureDepartment(db, 'IT');
    await ensureUser(db, 'admin', 'Admin', 'admin', null, deptId);
    await ensureUser(db, 'test-testuser', 'Test User', 'site-content-employee', null, deptId);
    await ensureUser(db, 'cms-admin', 'Website Admin', 'cms-admin', null, deptId);
    await ensureUser(db, 'superadmin', 'Super Admin', 'super-admin', null, deptId);
    for (const f of rows) {
      await ensureUser(
        db,
        `entry-${f.abbreviation.toLowerCase()}`,
        `${f.nameEn} Entry`,
        'data-entry',
        f.id,
        deptId,
      );
    }
  } finally {
    await db.$client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
