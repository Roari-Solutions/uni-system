import {
  Global,
  Inject,
  Logger,
  Module,
  type OnModuleInit,
} from '@nestjs/common';
import {
  DATABASE,
  DatabaseModule,
  type Db,
} from 'src/database/database.module';
import { ensureGrants } from './grants';
import { AccessService } from './access.service';
import { PermissionGuard } from './permission.guard';

/** Roles, permissions and portals; global so every module's guards can use them. */
@Global()
@Module({
  imports: [DatabaseModule],
  providers: [AccessService, PermissionGuard],
  exports: [AccessService, PermissionGuard],
})
export class IamModule implements OnModuleInit {
  private readonly logger = new Logger(IamModule.name);

  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /** Adds any role, permission or grant the code expects and the database lacks. */
  async onModuleInit(): Promise<void> {
    try {
      await ensureGrants(this.db);
    } catch (error) {
      // a database without the 0015 tables still serves everything but sign-in
      this.logger.error(
        'Could not ensure role grants; is migration 0015 applied?',
        error,
      );
    }
  }
}
