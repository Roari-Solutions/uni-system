import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { users } from 'schema';
import { AuthedRequest } from 'src/auth/auth.guard';
import { DATABASE, type Db } from 'src/database/database.module';

/** Caller identity for /gr authorization; facultyId set for data-entry only. */
export interface GrCaller {
  role: string;
  facultyId?: string;
}

/** Request carrying the verified user plus the guard-attached caller. */
export interface GrRequest extends AuthedRequest {
  grCaller: GrCaller;
}

/**
 * Faculty-scope gate for /gr routes.
 * Must run after AuthGuard: relies on req.user being set.
 * Attaches req.grCaller; row-level checks live in GradesService.
 */
@Injectable()
export class GrGurdGuard implements CanActivate {
  private readonly logger = new Logger(GrGurdGuard.name);

  constructor(@Inject(DATABASE) private readonly db: Db) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<GrRequest>();

    if (!req.user) throw new UnauthorizedException();

    if (req.user.role === 'admin') {
      req.grCaller = { role: req.user.role };
      return true;
    }

    if (req.user.role !== 'data-entry') throw new UnauthorizedException();

    const facultyObj = await this.db.query.users.findFirst({
      where: eq(users.id, req.user.sub),
      columns: { facultyId: true },
    });

    if (!facultyObj?.facultyId) throw new UnauthorizedException();

    req.grCaller = { role: req.user.role, facultyId: facultyObj.facultyId };

    return true;
  }
}
