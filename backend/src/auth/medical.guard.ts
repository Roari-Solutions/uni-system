import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthedRequest } from './auth.guard';
import { DATABASE, type Db } from 'src/database/database.module';
import { eq } from 'drizzle-orm';
import { users } from 'schema';

/** Allows every request; the medical-form permission check goes here. */
@Injectable()
export class MedicalGuard implements CanActivate {
  // ponytail: allow-all stub, deny without the medical-form permission when wired
  constructor(@Inject(DATABASE) private readonly db: Db) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest() as AuthedRequest;

    const userId = req.user?.sub;

    if (!userId) {
      console.log('unautherized attmept to access medical forms');
      throw new UnauthorizedException();
    }

    const row = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      with: { userRoles: { with: { role: true } } },
    });

    if (!row) {
      console.log('unautherized attmept to access medical forms');
      throw new UnauthorizedException();
    }

    const result = row.userRoles.at(0)?.role.name === 'medical';

    return result;
  }
}
