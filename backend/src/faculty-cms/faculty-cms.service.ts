import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { faculties, facultyPages } from 'schema';
import { FacultyPageContent } from 'src/content/entities/faculty-page.entity';
import { DATABASE, type Db } from 'src/database/database.module';
import { MediaService, type MediaFile } from 'src/media/media.service';
import { UpdateFacultyPageDto } from './dto/update-faculty-page.dto';

export type StoredFiles = {
  backgroundImages?: string[];
};

function imageList(files: string[] | undefined, oldList: string[] | undefined): string[] {
  return files ?? oldList ?? [];
}

/** Merges patched sections and uploaded-file URLs over stored faculty content. */
export function mergeFacultyPage(
  existing: Partial<FacultyPageContent> | undefined,
  dto: UpdateFacultyPageDto,
  stored: StoredFiles,
): FacultyPageContent {
  const base = existing ?? {};
  const merged: Record<string, unknown> = { ...base, ...dto };

  const heroSrc = dto.heroSection ?? base.heroSection;
  if (heroSrc) {
    merged.heroSection = {
      ...heroSrc,
      backgroundImages: imageList(stored.backgroundImages, base.heroSection?.backgroundImages),
    };
  }

  // ponytail: partial until every section patched once
  return merged as FacultyPageContent;
}

@Injectable()
/** Reads and patches the per-faculty JSON document. */
export class FacultyCmsService {
  constructor(
    @Inject(DATABASE) private readonly db: Db,
    private readonly mediaService: MediaService,
  ) {}
  logger = new Logger(FacultyCmsService.name);

  /** Returns the faculty page content, or null before the first patch. */
  async get(facultyId: string): Promise<FacultyPageContent | null> {
    try {
      const faculty = await this.db.query.faculties.findFirst({
        where: eq(faculties.id, facultyId),
      });
      if (!faculty) throw new NotFoundException({ code: 'NF' });

      const row = await this.db.query.facultyPages.findFirst({
        where: eq(facultyPages.facultyId, facultyId),
      });
      if (!row) throw new NotFoundException({ code: 'NF' });

      return row?.content ?? {};
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('error getting faculty page content', error);
      throw new InternalServerErrorException('Faculty page fetch failed', {
        cause: error,
      });
    }
  }

  /** Applies a partial body plus uploaded images over stored faculty content. */
  async patch(
    facultyId: string,
    body: UpdateFacultyPageDto,
    files: MediaFile[],
  ): Promise<{ status: string }> {
    //  fieldname convention — backgroundImages

    const faculty = await this.db.query.faculties.findFirst({
      where: eq(faculties.id, facultyId),
    });
    if (!faculty) throw new NotFoundException({ code: 'NF' });

    const stored: StoredFiles = {};

    for (const f of files) {
      if (f.fieldname === 'backgroundImages') {
        const url = await this.mediaService.storeImage(f.buffer, f.mimetype);
        (stored.backgroundImages ??= []).push(url);
      } else this.logger.warn(`ignored file field: ${f.fieldname}`);
    }

    this.logger.log(`media files stored and organized in an object`);
    const existing = await this.db.query.facultyPages.findFirst({
      where: eq(facultyPages.facultyId, facultyId),
    });

    const merged = mergeFacultyPage(existing?.content, body, stored);

    this.logger.log('new faculty page content constructed');

    try {
      if (existing)
        await this.db
          .update(facultyPages)
          .set({ content: merged })
          .where(eq(facultyPages.facultyId, facultyId));
      else await this.db.insert(facultyPages).values({ facultyId, content: merged });
    } catch (error) {
      throw new InternalServerErrorException('Faculty page store failed', {
        cause: error,
      });
    }

    this.logger.log('new faculty page content stored');

    return { status: 'ok' };
  }
}
