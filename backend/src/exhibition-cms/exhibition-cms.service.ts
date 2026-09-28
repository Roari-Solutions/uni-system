import {
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { imageExhibitionPage } from 'schema';
import { ImagesExhibition } from 'src/content/entities/images-exhibition.entity';
import { DATABASE, type Db } from 'src/database/database.module';
import { MediaService, type MediaFile } from 'src/media/media.service';
import { UpdateExhibitionCmDto } from './dto/update-exhibition-cm.dto';

/** Uploaded-file URLs grouped by form field. */
export type StoredExhibitionFiles = {
  imagesByIndex: Record<number, string>;
  moreImagesByIndex: Record<number, string>;
};

/** Merges patched sections and uploaded-file URLs over stored content. */
export function mergeExhibition(
  existing: Partial<ImagesExhibition> | undefined,
  dto: UpdateExhibitionCmDto,
  stored: StoredExhibitionFiles,
): ImagesExhibition {
  const base = existing ?? {};
  const merged: UpdateExhibitionCmDto = { ...base, ...dto };

  if (dto.images || Object.keys(stored.imagesByIndex).length > 0) {
    const cards = dto.images ?? base.images ?? [];
    merged.images = cards.map((card, index) => ({
      ...card,
      imageLink: stored.imagesByIndex[index] ?? card.imageLink ?? '',
    }));
  }

  if (dto.moreImages || Object.keys(stored.moreImagesByIndex).length > 0) {
    const cards = dto.moreImages ?? base.moreImages ?? [];
    merged.moreImages = cards.map((card, index) => ({
      ...card,
      imageLink: stored.moreImagesByIndex[index] ?? card.imageLink ?? '',
    }));
  }

  // ponytail: partial until every section patched once
  return merged as ImagesExhibition;
}

@Injectable()
export class ExhibitionCmsService {
  constructor(
    @Inject(DATABASE) private readonly db: Db,
    private readonly mediaService: MediaService,
  ) {}
  logger = new Logger(ExhibitionCmsService.name);

  async get() {
    const row = await this.db.query.imageExhibitionPage.findFirst();
    return row?.content ?? null;
  }

  /** Applies a partial body plus uploaded images over stored content. */
  async update(dto: UpdateExhibitionCmDto, files: MediaFile[] = []): Promise<{ status: string }> {
    // ponytail: fieldname convention — images_<index>, moreImages_<index>
    const stored: StoredExhibitionFiles = {
      imagesByIndex: {},
      moreImagesByIndex: {},
    };
    for (const f of files) {
      const img = /^images_(\d+)$/.exec(f.fieldname);
      const more = /^moreImages_(\d+)$/.exec(f.fieldname);
      if (img)
        stored.imagesByIndex[Number(img[1])] = await this.mediaService.storeImage(
          f.buffer,
          f.mimetype,
        );
      else if (more)
        stored.moreImagesByIndex[Number(more[1])] = await this.mediaService.storeImage(
          f.buffer,
          f.mimetype,
        );
      else this.logger.warn(`ignored file field: ${f.fieldname}`);
    }

    //  uploads stay outside the try so media 400s errors are never wrapped in 500s
    try {
      const existing = await this.db.query.imageExhibitionPage.findFirst();

      const merged = mergeExhibition(
        existing?.content as Partial<ImagesExhibition> | undefined,
        dto,
        stored,
      );

      if (existing)
        await this.db
          .update(imageExhibitionPage)
          .set({ content: merged })
          .where(eq(imageExhibitionPage.id, existing.id));
      else await this.db.insert(imageExhibitionPage).values({ content: merged });

      return { status: 'ok' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Exhibition patch failed', error);
      throw new InternalServerErrorException('Exhibition patch failed', {
        cause: error,
      });
    }
  }
}
