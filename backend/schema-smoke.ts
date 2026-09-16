/** Smoke-checks the new schema constraints, then rolls everything back. */
import { eq, sql } from 'drizzle-orm';
import { getDb } from './seed_user';
import * as schema from './schema';

class Rollback extends Error {}

const main = async () => {
  const db = getDb();
  let passed = 0;
  const ok = (label: string) => {
    passed += 1;
    console.log(`PASS: ${label}`);
  };
  // Probes run inside a savepoint (see inside transaction below).
  let probe = 0;

  try {
    await db.transaction(async (tx) => {
      const expectUniqueViolation = async (label: string, fn: () => Promise<unknown>) => {
        probe += 1;
        const sp = sql.raw(`smoke_probe_${probe}`);
        await tx.execute(sql`SAVEPOINT ${sp}`);
        try {
          await fn();
          await tx.execute(sql`ROLLBACK TO SAVEPOINT ${sp}`);
          console.log(`FAIL: ${label} — duplicate insert succeeded`);
          process.exitCode = 1;
        } catch (error) {
          await tx.execute(sql`ROLLBACK TO SAVEPOINT ${sp}`);
          // Drizzle wraps the pg error: walk the cause chain for code 23505.
          const chain: unknown[] = [error];
          for (let cur = error instanceof Error ? error.cause : undefined; cur; cur = cur instanceof Error ? cur.cause : undefined) chain.push(cur);
          const text = chain
            .map((e) => (e instanceof Error ? `${e.message} ${(e as { code?: unknown }).code ?? ''}` : String(e)))
            .join(' | ');
          if (/unique|duplicate|23505/i.test(text)) ok(`${label} (duplicate rejected)`);
          else {
            console.log(`FAIL: ${label} — unexpected error: ${text.slice(0, 300)}`);
            process.exitCode = 1;
          }
        }
      };

      const [faculty] = await tx.insert(schema.faculties).values({ name: 'smoke-fac' }).returning();
      ok('insert faculty');

      const [user] = await tx
        .insert(schema.users)
        .values({ name: 'smoke-u', email: 'smoke-u@x.com', password: 'x', facultyId: faculty.id })
        .returning();
      ok('insert user with faculty');

      await expectUniqueViolation('faculty<->user 1-to-1', () =>
        tx
          .insert(schema.users)
          .values({ name: 'smoke-u2', email: 'smoke-u2@x.com', password: 'x', facultyId: faculty.id }),
      );

      const [dept] = await tx.insert(schema.departments).values({ name: 'smoke-dept' }).returning();
      const [role] = await tx.insert(schema.roles).values({ name: 'smoke-role', level: '1' }).returning();
      const [perm] = await tx.insert(schema.permissions).values({ name: 'smoke-perm' }).returning();
      await tx.insert(schema.rolePermissions).values({ roleId: role.id, permissionId: perm.id });
      ok('insert role_permission');
      await expectUniqueViolation('role_permission dedupe', () =>
        tx.insert(schema.rolePermissions).values({ roleId: role.id, permissionId: perm.id }),
      );

      await tx.insert(schema.employees).values({ userId: user.id, departmentId: dept.id, roleId: role.id });
      ok('insert employee');
      await expectUniqueViolation('user<->employee 1-to-1', () =>
        tx.insert(schema.employees).values({ userId: user.id, departmentId: dept.id, roleId: role.id }),
      );

      await tx.insert(schema.usersDepartments).values({ userId: user.id, departmentId: dept.id });
      ok('insert usersDepartments join');
      await expectUniqueViolation('usersDepartments dedupe', () =>
        tx.insert(schema.usersDepartments).values({ userId: user.id, departmentId: dept.id }),
      );

      const [student] = await tx
        .insert(schema.students)
        .values({
          uniNumber: 'smoke-1',
          name: 'smoke-s',
          acceptanceType: 'x',
          acceptanceYear: 2026,
          facultyId: faculty.id,
        })
        .returning();
      const [curriculum] = await tx
        .insert(schema.curriculums)
        .values({ name: 'smoke-cur', code: 'smoke-code' })
        .returning();
      await tx
        .insert(schema.grades)
        .values({ studentId: student.id, curriculumId: curriculum.id, grade: '90.00', academicYear: '2026', semester: '1' });
      ok('insert grade');
      await tx
        .insert(schema.results)
        .values({ studentId: student.id, academicYear: '2026', semester: '1', result: '90.00', gpa: '3.50' });
      ok('insert result');
      await expectUniqueViolation('result per semester dedupe', () =>
        tx
          .insert(schema.results)
          .values({ studentId: student.id, academicYear: '2026', semester: '1', result: '80.00', gpa: '3.00' }),
      );

      const [article] = await tx.insert(schema.news).values({ title: 'smoke-news', content: 'c' }).returning();
      await new Promise((r) => setTimeout(r, 20));
      const [touched] = await tx
        .update(schema.news)
        .set({ content: 'c2' })
        .where(eq(schema.news.id, article.id))
        .returning();
      if (touched.updatedAt.getTime() > article.updatedAt.getTime()) ok('updatedAt auto-bumps on update');
      else {
        console.log('FAIL: updatedAt did not advance');
        process.exitCode = 1;
      }

      const withRelations = await tx.query.users.findFirst({
        where: eq(schema.users.id, user.id),
        with: { faculty: true, employee: { with: { role: true } }, usersDepartments: true },
      });
      if (withRelations?.faculty?.id === faculty.id && withRelations?.employee?.role?.name === 'smoke-role') {
        ok('relational query users→faculty/employee/role/joins');
      } else {
        console.log('FAIL: relational query returned wrong shape');
        process.exitCode = 1;
      }

      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }
  console.log(`\n${passed} checks passed — transaction rolled back, DB untouched`);
  await db.$client.end();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
