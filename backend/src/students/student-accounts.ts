import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as bcrypt from 'bcrypt';
import * as schema from '../../schema';
import { MISSING_NAME } from '../common/dto/localized-name.dto';
import { ROLES } from '../iam/permissions';

type Db = NodePgDatabase<typeof schema>;

const BCRYPT_ROUNDS = 10;

/** What a run of makeStudentAccounts did. */
export interface StudentAccountsReport {
  created: number;
  /** Students whose uni number is already someone else's login; they get no account. */
  clashes: string[];
}

/**
 * Gives every student who has no account one: the login and the password are
 * both their uni number, flagged as default credentials so the views remind
 * them to change both. Students who already have one are left alone, so this
 * is safe to run again. Pass ids to limit it to those students.
 */
export async function makeStudentAccounts(
  db: Db,
  studentIds?: readonly string[],
): Promise<StudentAccountsReport> {
  if (studentIds && !studentIds.length) return { created: 0, clashes: [] };

  const role = await db.query.roles.findFirst({
    where: eq(schema.roles.name, ROLES.student),
    columns: { id: true },
  });
  // ensureGrants makes the role on startup; a database without it has nothing to give
  if (!role) throw new Error(`the ${ROLES.student} role does not exist`);

  const pending = await db.query.students.findMany({
    where: and(
      isNull(schema.students.userId),
      studentIds ? inArray(schema.students.id, [...studentIds]) : undefined,
    ),
    columns: {
      id: true,
      uniNumber: true,
      nameEn: true,
      nameAr: true,
      facultyId: true,
    },
  });

  const report: StudentAccountsReport = { created: 0, clashes: [] };
  for (const student of pending) {
    const login = student.uniNumber.trim();
    const taken = await db.query.users.findFirst({
      where: eq(schema.users.email, login),
      columns: { id: true },
    });
    // never link a student to an account someone else signs in with
    if (taken) {
      report.clashes.push(login);
      continue;
    }

    const password = await bcrypt.hash(login, BCRYPT_ROUNDS);
    await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(schema.users)
        .values({
          name:
            student.nameEn === MISSING_NAME ? student.nameAr : student.nameEn,
          email: login,
          password,
          defaultCredentials: true,
          facultyId: student.facultyId,
        })
        .returning({ id: schema.users.id });
      await tx
        .insert(schema.userRoles)
        .values({ userId: user.id, roleId: role.id });
      await tx
        .update(schema.students)
        .set({ userId: user.id })
        .where(eq(schema.students.id, student.id));
    });
    report.created++;
  }
  return report;
}
