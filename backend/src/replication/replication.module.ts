import { Inject, Logger, Module, type OnModuleInit } from '@nestjs/common';
import { Pool, type PoolClient } from 'pg';
import { DatabaseModule, POOL } from 'src/database/database.module';
import { config } from 'config';

/** The role the LMS's subscription signs in as. */
export const REPLICATOR_ROLE = 'lms_replicator';

/** The publication the LMS subscribes to. */
export const LMS_PUBLICATION = 'lms_core';

/**
 * The tables the LMS reads: who users are and what they may do, and the
 * academic structure that decides which courses a student takes. Every column
 * is published except users.password; the LMS never checks passwords.
 */
export const LMS_TABLES = [
  'users',
  'roles',
  'permissions',
  'role_permissions',
  'user_roles',
  'faculties',
  'faculty_departments',
  'specializations',
  'curriculums',
  'faculty_curriculums',
  'students',
] as const;

/** Columns kept out of the publication, by table. */
const UNPUBLISHED: Partial<Record<(typeof LMS_TABLES)[number], string[]>> = {
  users: ['password'],
};

/**
 * Keeps the LMS's publication in step with the code on every start: the
 * replicator role, its read access, and the published tables. Runs only when
 * LMS_REPLICATION_PASSWORD is set, so a deploy without the LMS is untouched.
 * A new column on a published table is published on the next start, so the
 * LMS must add it to its copy first, or its subscription stops until it does.
 */
@Module({ imports: [DatabaseModule] })
export class ReplicationModule implements OnModuleInit {
  private readonly logger = new Logger(ReplicationModule.name);

  constructor(@Inject(POOL) private readonly pool: Pool) {}

  async onModuleInit(): Promise<void> {
    const password = config.lmsReplicationPassword;
    if (!password) return;

    const client = await this.pool.connect();
    try {
      const { rows } = await client.query<{ wal_level: string }>(
        'SHOW wal_level',
      );
      if (rows[0]?.wal_level !== 'logical') {
        this.logger.warn(
          `wal_level is ${rows[0]?.wal_level}; the LMS cannot subscribe until the database runs with wal_level=logical`,
        );
      }
      await this.ensureRole(client, password);
      const tables = await this.publishedTables(client);
      await this.ensurePublication(client, tables);
      this.logger.log(
        `Publication ${LMS_PUBLICATION} covers ${LMS_TABLES.length} tables`,
      );
    } catch (error) {
      // the platform keeps serving; only the LMS's copy stops following
      this.logger.error('Could not set up the LMS publication', error);
    } finally {
      client.release();
    }
  }

  /** The replicator may sign in for replication and read the published columns, nothing more. */
  private async ensureRole(
    client: PoolClient,
    password: string,
  ): Promise<void> {
    const { rowCount } = await client.query(
      'SELECT 1 FROM pg_roles WHERE rolname = $1',
      [REPLICATOR_ROLE],
    );
    const secret = client.escapeLiteral(password);
    await client.query(
      rowCount
        ? `ALTER ROLE ${REPLICATOR_ROLE} WITH LOGIN REPLICATION PASSWORD ${secret}`
        : `CREATE ROLE ${REPLICATOR_ROLE} WITH LOGIN REPLICATION PASSWORD ${secret}`,
    );
  }

  /** Each table with the columns it publishes: null for all of them. */
  private async publishedTables(
    client: PoolClient,
  ): Promise<{ table: string; columns: string[] | null }[]> {
    const tables: { table: string; columns: string[] | null }[] = [];
    for (const table of LMS_TABLES) {
      const hidden = UNPUBLISHED[table];
      if (!hidden) {
        await client.query(`GRANT SELECT ON ${table} TO ${REPLICATOR_ROLE}`);
        tables.push({ table, columns: null });
        continue;
      }
      const { rows } = await client.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
        [table],
      );
      const columns = rows
        .map((r) => r.column_name)
        .filter((c) => !hidden.includes(c));
      const list = columns.map((c) => client.escapeIdentifier(c)).join(', ');
      // a column grant: the replicator can't read the hidden ones even by hand
      await client.query(`REVOKE SELECT ON ${table} FROM ${REPLICATOR_ROLE}`);
      await client.query(
        `GRANT SELECT (${list}) ON ${table} TO ${REPLICATOR_ROLE}`,
      );
      tables.push({ table, columns });
    }
    return tables;
  }

  private async ensurePublication(
    client: PoolClient,
    tables: { table: string; columns: string[] | null }[],
  ): Promise<void> {
    const spec = tables
      .map(({ table, columns }) =>
        columns
          ? `${table} (${columns.map((c) => client.escapeIdentifier(c)).join(', ')})`
          : table,
      )
      .join(', ');
    const { rowCount } = await client.query(
      'SELECT 1 FROM pg_publication WHERE pubname = $1',
      [LMS_PUBLICATION],
    );
    await client.query(
      rowCount
        ? `ALTER PUBLICATION ${LMS_PUBLICATION} SET TABLE ${spec}`
        : `CREATE PUBLICATION ${LMS_PUBLICATION} FOR TABLE ${spec}`,
    );
  }
}
