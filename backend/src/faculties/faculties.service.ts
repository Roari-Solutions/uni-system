import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { faculties } from 'schema';
import { DATABASE, type Db } from 'src/database/database.module';
import { GrCaller } from 'src/gr-gurd/gr-gurd.guard';
import { scopeFacultyId } from 'src/gr-scope/gr-scope';

/** A faculty as the views consume it: one row, both languages. */
export interface FacultyView {
  id: string;
  name: { en: string; ar: string };
  /** Two letters; the bulk import builds university numbers from them. */
  abbreviation: string | null;
}

/** Read-only faculty lookup backing the faculty selects in the grades views. */
@Injectable()
export class FacultiesService {
  private readonly logger = new Logger(FacultiesService.name);

  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /** Lists faculties: all for admin, only their own for data-entry. */
  async listFaculties(caller: GrCaller): Promise<FacultyView[]> {
    try {
      const scope = scopeFacultyId(caller);
      const rows = scope
        ? await this.db.query.faculties.findMany({ where: eq(faculties.id, scope) })
        : await this.db.query.faculties.findMany();

      return rows.map((row) => ({
        id: row.id,
        name: { en: row.nameEn, ar: row.nameAr },
        abbreviation: row.abbreviation,
      }));
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('Failed to list faculties', error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }
}
