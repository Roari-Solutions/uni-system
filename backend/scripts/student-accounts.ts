/**
 * Gives every student without an account one, signing in with their uni number
 * as both login and password. New students get theirs when they are added;
 * this is for the students who existed before accounts did:
 *
 *   bun run student-accounts
 *
 * Safe to run again: students who have an account are skipped.
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema';
import { config } from '../config';
import { ensureGrants } from '../src/iam/grants';
import { makeStudentAccounts } from '../src/students/student-accounts';

async function main() {
  const pool = new Pool({ connectionString: config.databaseUrl });
  const db = drizzle(pool, { schema });
  try {
    await ensureGrants(db);
    const { created, clashes } = await makeStudentAccounts(db);
    console.log(`Created ${created} student accounts.`);
    if (clashes.length) {
      console.log(
        `Skipped ${clashes.length} students whose uni number is already another user's login:`,
      );
      for (const login of clashes) console.log(`  ${login}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
