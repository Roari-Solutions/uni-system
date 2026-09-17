import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { eq } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';
import type { Db } from './src/database/database.module';
import type { JwtPayload } from './src/auth/auth.guard';
import { config } from './config';

// ---------- db ----------
/** Opens a Drizzle handle using the central database URL. */
export function getDb() {
  return drizzle(new Pool({ connectionString: config.databaseUrl }), {
    schema,
  });
}

// ---------- helpers ----------
/** Hashes a plaintext password with bcrypt. */
export async function hashPassword(pass: string) {
  return bcrypt.hash(pass, 10);
}

/** Inserts the seed user (idempotent on email). */
export async function seedUser(db: Db, name: string, hashed: string) {
  const [user] = await db
    .insert(schema.users)
    .values({ name, password: hashed, email: `test-${name}` })
    .onConflictDoNothing({ target: schema.users.email })
    .returning();
  return user;
}

/** Inserts the seed department (idempotent on name). */
export async function seedDepartment(db: Db, deptName = 'IT') {
  const [dept] = await db
    .insert(schema.departments)
    .values({ name: deptName })
    .onConflictDoNothing({ target: schema.departments.name })
    .returning();
  return dept;
}

/** Inserts the seed role (idempotent on name). */
export async function seedRole(
  db: Db,
  roleName = 'site-content-employee',
  level: '1' | '2' | '3' | '4' = '1',
) {
  const [role] = await db
    .insert(schema.roles)
    .values({ name: roleName, level })
    .onConflictDoNothing({ target: schema.roles.name })
    .returning();
  return role;
}

/** Links the seed user to a department and role as an employee. */
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

/** Reloads the seeded user/employee/role chain for verification. */
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
/** Verifies a token with the access secret. */
export function decodeAccessToken(token: string) {
  return jwt.verify(token, config.jwtAccessSecret) as jwt.JwtPayload &
    JwtPayload;
}

/** Verifies a token with the refresh secret. */
export function decodeRefreshToken(token: string) {
  return jwt.verify(token, config.jwtRefreshSecret) as jwt.JwtPayload &
    JwtPayload;
}

/** Verifies an access or refresh token with the matching secret. */
export function decodeToken(
  token: string,
  type: 'access' | 'refresh' = 'access',
) {
  return type === 'refresh'
    ? decodeRefreshToken(token)
    : decodeAccessToken(token);
}

/** Decodes a token without verifying (debugging only). */
export function decodeUnsafe(token: string) {
  return jwt.decode(token, { complete: true });
}

// ---------- cli modes ----------
function parseDecodeTokens(args: string[]) {
  const getArg = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  return {
    accessToken:
      getArg('--decode-access') ??
      (args.includes('--decode')
        ? args[args.indexOf('--decode') + 1]
        : undefined),
    refreshToken:
      getArg('--decode-refresh') ??
      (args.includes('--decode')
        ? args[args.indexOf('--decode') + 2]
        : undefined),
  };
}

function runDecodeMode(args: string[]) {
  const { accessToken, refreshToken } = parseDecodeTokens(args);

    if (accessToken) {
      try {
        console.log('access:', decodeAccessToken(accessToken));
      } catch (e: unknown) {
        console.error('access decode failed:', e);
        console.log('unsafe:', decodeUnsafe(accessToken));
      }
    }
    if (refreshToken) {
      try {
        console.log('refresh:', decodeRefreshToken(refreshToken));
      } catch (e: unknown) {
        console.error('refresh decode failed:', e);
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
async function runSeedMode(args: string[]) {
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
      } catch {
        // best-effort: extra token may not be a valid access token
      }
    }
  } finally {
    await db.$client.end();
  }
}

// ---------- main ----------
const main = async () => {
  const args = process.argv.slice(2);
  // --decode mode: npm run seed -- --decode <access> [refresh] / --decode-access / --decode-refresh
  if (
    args.includes('--decode') ||
    args.includes('--decode-access') ||
    args.includes('--decode-refresh')
  ) {
    runDecodeMode(args);
    return;
  }
  await runSeedMode(args);
};
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
