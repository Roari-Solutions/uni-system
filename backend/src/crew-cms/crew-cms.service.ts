import {
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { crewPage, crews } from 'schema';
import { CrewPage } from 'src/content/entities/crew-page.entity';
import { DATABASE, type Db } from 'src/database/database.module';
import { MediaService, type MediaFile } from 'src/media/media.service';
import { UpdateCrewCmDto } from './dto/update-crew-cm.dto';

/** Prefers uploaded photo URL, then stored value. */
function photoUrl(file: string | undefined, oldUrl: string | undefined): string | undefined {
  return file ?? oldUrl;
}

/** Merges a patched body plus uploaded photo over stored content. */
export function mergeCrewPage(
  existing: Partial<CrewPage> | undefined,
  dto: UpdateCrewCmDto,
  photo: string | undefined,
): CrewPage {
  const base = existing ?? {};

  return {
    ...base,
    ...dto,
    photo: photoUrl(photo, base.photo ?? dto.photo),
  } as CrewPage;
}

/** Reads and patches the per-crew page document. */
@Injectable()
export class CrewCmsService {
  constructor(
    @Inject(DATABASE) private readonly db: Db,
    private readonly mediaService: MediaService,
  ) {}
  logger = new Logger(CrewCmsService.name);

  /** Returns the crew row or throws 404. */
  async requireCrew(crewId: string) {
    const crew = await this.db.query.crews.findFirst({ where: eq(crews.id, crewId) });

    if (!crew) throw new NotFoundException({ code: 'NF' });

    return crew;
  }

  /** Returns the crew page content, or null before the first patch. */
  async get(crewId: string): Promise<CrewPage | null> {
    try {
      await this.requireCrew(crewId);

      const row = await this.db.query.crewPage.findFirst({
        where: eq(crewPage.crewId, crewId),
      });

      return (row?.content as CrewPage | undefined) ?? null;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Crew page fetch failed', error);
      throw new InternalServerErrorException('Crew page fetch failed', { cause: error });
    }
  }

  /** Applies a partial body plus uploaded photo over stored content. */
  async patch(
    crewId: string,
    body: UpdateCrewCmDto,
    files: MediaFile[],
  ): Promise<{ status: string }> {
    // ponytail: fieldname convention — photo
    let photo: string | undefined;
    for (const f of files) {
      if (f.fieldname === 'photo') photo = await this.mediaService.storeImage(f.buffer, f.mimetype);
      else this.logger.warn(`ignored file field: ${f.fieldname}`);
    }

    // ponytail: uploads stay outside the try so media 400s are never wrapped in 500s
    try {
      await this.requireCrew(crewId);

      const existing = await this.db.query.crewPage.findFirst({
        where: eq(crewPage.crewId, crewId),
      });

      const merged = mergeCrewPage(
        existing?.content as Partial<CrewPage> | undefined,
        body,
        photo,
      );

      if (existing)
        await this.db.update(crewPage).set({ content: merged }).where(eq(crewPage.id, existing.id));
      else await this.db.insert(crewPage).values({ crewId, content: merged });

      this.logger.log('Crew page patched');

      return { status: 'ok' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Crew page patch failed', error);
      throw new InternalServerErrorException('Crew page patch failed', { cause: error });
    }
  }
}
