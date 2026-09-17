import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { config as appConfig } from './config';
config();

export default defineConfig({
  dialect: 'postgresql',
  schema: './schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: appConfig.databaseUrl,
  },
});
