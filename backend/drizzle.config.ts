import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
config();

export default defineConfig({
  dialect: 'postgresql',
  schema: './schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://localhost:5432/uni_system',
  },
});
