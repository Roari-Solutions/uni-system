import { Inject, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../schema';

/** Injection token for the Drizzle database handle. */
export const DATABASE = 'DATABASE';
/** Injection token for the raw pg pool. */
export const POOL = 'POOL';
/** Drizzle database type bound to this app's schema. */
export type Db = NodePgDatabase<typeof schema>;

@Module({
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
        const logger = new Logger('Database');
        const db = drizzle(pool, { schema });
        logger.log('Drizzle ORM initialized');
        return db;
      },
    },
  ],

  exports: [DATABASE, POOL],
})
/** Provides the pg pool and Drizzle handle; closes the pool on shutdown. */
export class DatabaseModule {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(
    @Inject(POOL) private readonly pool: Pool,
    @Inject(DATABASE) public readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('PostgreSQL pool connected');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing PostgreSQL pool');
    await this.pool.end();
  }
}
