import 'dotenv/config';
import { inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { config } from './config';
import type { AcceptanceType } from './src/students/dto/students.dto';

/** How many students each faculty gets. */
const PER_FACULTY = 10;

/** The year the newest intake was admitted; level N was admitted N-1 years earlier. */
const LATEST_INTAKE = 2026;

/** Name parts in both UI languages; a student's name is first + father + grandfather. */
const FIRST_NAMES = [
  { en: 'Ahmed', ar: 'أحمد' },
  { en: 'Mohamed', ar: 'محمد' },
  { en: 'Fatima', ar: 'فاطمة' },
  { en: 'Omer', ar: 'عمر' },
  { en: 'Aisha', ar: 'عائشة' },
  { en: 'Khalid', ar: 'خالد' },
  { en: 'Mariam', ar: 'مريم' },
  { en: 'Hassan', ar: 'حسن' },
  { en: 'Amna', ar: 'آمنة' },
  { en: 'Osman', ar: 'عثمان' },
  { en: 'Sara', ar: 'سارة' },
  { en: 'Yousif', ar: 'يوسف' },
  { en: 'Hiba', ar: 'هبة' },
  { en: 'Ibrahim', ar: 'إبراهيم' },
  { en: 'Rania', ar: 'رانيا' },
  { en: 'Mustafa', ar: 'مصطفى' },
  { en: 'Nada', ar: 'ندى' },
];
const FAMILY_NAMES = [
  { en: 'Abdallah', ar: 'عبدالله' },
  { en: 'Elhassan', ar: 'الحسن' },
  { en: 'Babiker', ar: 'بابكر' },
  { en: 'Elnour', ar: 'النور' },
  { en: 'Mohamed Ali', ar: 'محمد علي' },
  { en: 'Elsheikh', ar: 'الشيخ' },
  { en: 'Hamad', ar: 'حمد' },
  { en: 'Ibrahim', ar: 'إبراهيم' },
  { en: 'Adam', ar: 'آدم' },
  { en: 'Siddig', ar: 'الصديق' },
  { en: 'Abdelrahman', ar: 'عبدالرحمن' },
];

/** Most students come through the general route; the rest rotate through the others. */
const ACCEPTANCE_ROTATION: AcceptanceType[] = [
  'general',
  'general',
  'general',
  'special',
  'general',
  'vacancies',
  'general',
  'teachersChildren',
  'arabCertificate',
  'international',
];

/** Opens a Drizzle handle using the central database URL. */
function getDb() {
  return drizzle(new Pool({ connectionString: config.databaseUrl }), {
    schema,
  });
}

/**
 * Builds the n-th student of a faculty. Everything is derived from the
 * faculty's position and n, so re-running produces the same rows.
 */
function buildStudent(
  faculty: { id: string; abbreviation: string },
  facultyIndex: number,
  n: number,
): typeof schema.students.$inferInsert {
  const seq = facultyIndex * PER_FACULTY + n;
  const first = FIRST_NAMES[seq % FIRST_NAMES.length];
  const father = FAMILY_NAMES[seq % FAMILY_NAMES.length];
  // offset by 1..length-1 from the father, so the two never repeat
  const grandfather =
    FAMILY_NAMES[
      (seq + 1 + ((seq * 3) % (FAMILY_NAMES.length - 1))) % FAMILY_NAMES.length
    ];
  // levels 1-4 spread evenly; each faculty runs at least four years
  const level = (n % 4) + 1;
  const acceptanceType = ACCEPTANCE_ROTATION[n % ACCEPTANCE_ROTATION.length];
  const foreign = acceptanceType === 'international';
  const serial = String(n + 1).padStart(3, '0');
  // tied to the abbreviation, not the faculty's position, so adding a faculty shifts nothing
  const facultyCode = [...faculty.abbreviation]
    .map((c) => c.charCodeAt(0))
    .join('');

  return {
    uniNumber: `${faculty.abbreviation}-${LATEST_INTAKE - level + 1}-${serial}`,
    nameEn: `${first.en} ${father.en} ${grandfather.en}`,
    nameAr: `${first.ar} ${father.ar} ${grandfather.ar}`,
    nationality: foreign ? 'foreign' : 'sudanese',
    nationalId: foreign ? null : `9${facultyCode}${serial}`,
    passportNumber: foreign ? `P${facultyCode}${serial}` : null,
    acceptanceType,
    acceptanceYear: String(LATEST_INTAKE - level + 1),
    academicYear: String(
      level,
    ) as (typeof schema.studyLevelEnum.enumValues)[number],
    facultyId: faculty.id,
  };
}

async function main() {
  const db = getDb();
  try {
    const faculties = await db.query.faculties.findMany({
      columns: { id: true, abbreviation: true },
      orderBy: (f, { asc }) => asc(f.abbreviation),
    });
    const usable = faculties.filter(
      (f): f is { id: string; abbreviation: string } => !!f.abbreviation,
    );
    if (!usable.length) {
      throw new Error('no faculties found; run `bun run seed:faculties` first');
    }

    const rows = usable.flatMap((f, i) =>
      Array.from({ length: PER_FACULTY }, (_, n) => buildStudent(f, i, n)),
    );

    // uni, national and passport numbers are all unique, so a re-run skips what exists
    const inserted = await db
      .insert(schema.students)
      .values(rows)
      .onConflictDoNothing()
      .returning({ uniNumber: schema.students.uniNumber });

    const present = await db.query.students.findMany({
      where: inArray(
        schema.students.uniNumber,
        rows.map((r) => r.uniNumber),
      ),
      columns: { uniNumber: true },
    });
    for (const f of usable) {
      const count = present.filter((s) =>
        s.uniNumber.startsWith(`${f.abbreviation}-`),
      ).length;
      console.log(
        `faculty ${f.abbreviation}: ${count}/${PER_FACULTY} seeded students present`,
      );
    }
    console.log(
      `${inserted.length} students created, ${rows.length - inserted.length} already there`,
    );
  } finally {
    await db.$client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
