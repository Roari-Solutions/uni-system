import * as bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const main = async () => {
  const pass = process.argv[3] ?? '123';
  const user = process.argv[2] ?? 'user';

  const hashed = await bcrypt.hash(pass, 10);

  const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), {
    schema,
  });

  const new_user = await db
    .insert(schema.users)
    .values({ name: user, password: hashed, email: `test-${user}` })
    .onConflictDoNothing({ target: schema.users.email })
    .returning();

  console.log(new_user);
  await db.$client.end();
};
main().catch((err) => {
  console.log(err);
});
