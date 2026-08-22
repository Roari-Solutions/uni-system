import { Inject, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../schema';

export const DATABASE = 'DATABASE';
export const POOL = 'POOL';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [
    {
      provide: POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new Pool({
          connectionString: config.getOrThrow('DATABASE_URL'),
        });
      },
    },

    {
      provide: DATABASE,
      inject: [POOL],
      useFactory: (pool: Pool) => {
        return drizzle(pool, { schema });
      },
    },
  ],

  exports: [DATABASE, POOL],
})
export class DatabaseModule {
  constructor(
    @Inject(POOL) private readonly pool: Pool,
    @Inject(DATABASE) public readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
