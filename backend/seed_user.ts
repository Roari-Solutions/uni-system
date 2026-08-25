import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { eq } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';
import type { Db } from './src/database/database.module';
import type { JwtPayload } from './src/auth/auth.guard';

// ---------- db ----------
export function getDb() {
  return drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), {
    schema,
  });
}

// ---------- helpers ----------
export async function hashPassword(pass: string) {
  return bcrypt.hash(pass, 10);
}

export async function seedUser(db: Db, name: string, hashed: string) {
  const [user] = await db
    .insert(schema.users)
    .values({ name, password: hashed, email: `test-${name}` })
    .onConflictDoNothing({ target: schema.users.email })
    .returning();
  return user;
}

export async function seedDepartment(db: Db, deptName = 'IT') {
  const [dept] = await db
    .insert(schema.departments)
    .values({ name: deptName })
    .returning();
  return dept;
}

export async function seedRole(
  db: Db,
  roleName = 'site-content-employee',
  level: '1' | '2' | '3' | '4' = '1',
) {
  const [role] = await db
    .insert(schema.roles)
    .values({ name: roleName, level })
    .returning();
  return role;
}

export async function seedEmployee(
  db: Db,
  userId: string,
  departmentId: string,
  roleId: string,
) {
  const [emp] = await db
    .insert(schema.employees)
    .values({ userId, departmentId, roleId })
    .returning();
  return emp;
}

export async function verifySeed(db: Db, id: string) {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, id),
  });
  if (!user) return { user: null, employee: null, role: null, final: null };

  const employee = await db.query.employees.findFirst({
    where: eq(schema.employees.userId, user.id),
  });
  if (!employee) return { user, employee: null, role: null, final: null };

  const role = await db.query.roles.findFirst({
    where: eq(schema.roles.id, employee.roleId),
  });

  const final = await db.query.users.findFirst({
    where: eq(schema.users.id, id),
    with: {
      employee: { with: { role: { columns: { name: true } } }, columns: {} },
    },
    columns: { id: true },
  });

  return { user, employee, role, final };
}

// ---------- jwt decode ----------
export function decodeAccessToken(token: string) {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('Missing JWT_ACCESS_SECRET');
  return jwt.verify(token, secret) as jwt.JwtPayload & JwtPayload;
}

export function decodeRefreshToken(token: string) {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('Missing JWT_REFRESH_SECRET');
  return jwt.verify(token, secret) as jwt.JwtPayload & JwtPayload;
}

export function decodeToken(
  token: string,
  type: 'access' | 'refresh' = 'access',
) {
  return type === 'refresh'
    ? decodeRefreshToken(token)
    : decodeAccessToken(token);
}

export function decodeUnsafe(token: string) {
  return jwt.decode(token, { complete: true });
}

// ---------- main ----------
const main = async () => {
  const args = process.argv.slice(2);

  // --decode mode: npm run seed -- --decode <access> [refresh]  /  --decode-access / --decode-refresh
  if (
    args.includes('--decode') ||
    args.includes('--decode-access') ||
    args.includes('--decode-refresh')
  ) {
    const getArg = (flag: string) => {
      const i = args.indexOf(flag);
      return i !== -1 ? args[i + 1] : undefined;
    };

    const accessToken =
      getArg('--decode-access') ??
      (args.includes('--decode')
        ? args[args.indexOf('--decode') + 1]
        : undefined);
    const refreshToken =
      getArg('--decode-refresh') ??
      (args.includes('--decode')
        ? args[args.indexOf('--decode') + 2]
        : undefined);

    if (accessToken) {
      try {
        console.log('access:', decodeAccessToken(accessToken));
      } catch (e: any) {
        console.error('access decode failed:', e.message);
        console.log('unsafe:', decodeUnsafe(accessToken));
      }
    }
    if (refreshToken) {
      try {
        console.log('refresh:', decodeRefreshToken(refreshToken));
      } catch (e: any) {
        console.error('refresh decode failed:', e.message);
        console.log('unsafe:', decodeUnsafe(refreshToken));
      }
    }
    if (!accessToken && !refreshToken) {
      console.log('Usage:');
      console.log(
        '  npx tsx seed_user.ts --decode <accessToken> [refreshToken]',
      );
      console.log(
        '  npx tsx seed_user.ts --decode-access <token> --decode-refresh <token>',
      );
    }
    return;
  }

  // normal seed mode
  const user = args[0] ?? 'user';
  const pass = args[1] ?? '123';

  const hashed = await hashPassword(pass);
  const db = getDb();

  try {
    const newUser = await seedUser(db, user, hashed);
    const department = await seedDepartment(db);
    const role = await seedRole(db);

    const id = newUser?.id ?? '544a458b-5a8b-4abc-90b5-b0ac170fce54';
    if (newUser) {
      await seedEmployee(db, id, department.id, role.id);
    }

    const { final } = await verifySeed(db, id);
    console.log(final);
    if (newUser) console.log('seeded user:', newUser.id);

    if (args[2]) {
      try {
        console.log(
          'decoded extra token (as access):',
          decodeAccessToken(args[2]),
        );
      } catch {}
    }
  } finally {
    await db.$client.end();
  }
};
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
