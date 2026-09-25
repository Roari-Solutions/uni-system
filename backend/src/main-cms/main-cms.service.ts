import {
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { mainPage } from 'schema';
import { MainPageContent } from 'src/content/entities/main-page.entity';
import { DATABASE, type Db } from 'src/database/database.module';
import { MediaService, type MediaFile } from 'src/media/media.service';
import { UpdateMainPageDto } from './dto/main-page.dto';

/** Uploaded-file URLs grouped by form field. */
export type StoredFiles = {
  backgroundImages?: string[];
  managerPicture?: string;
  newsPictureByIndex: Record<number, string>;
};

/** Prefers uploaded file URL, then stored value. */
function imageUrl(file: string | undefined, oldUrl: string | undefined): string {
  return file ?? oldUrl ?? '';
}

/** Same as imageUrl for image lists. */
function imageList(files: string[] | undefined, oldList: string[] | undefined): string[] {
  return files ?? oldList ?? [];
}

/** Merges patched sections and uploaded-file URLs over stored content. */
export function mergeMainPage(
  existing: Partial<MainPageContent> | undefined,
  dto: UpdateMainPageDto,
  stored: StoredFiles,
): MainPageContent {
  const base = existing ?? {};
  const merged: Record<string, unknown> = { ...base, ...dto };

  const heroSrc = dto.heroSection ?? base.heroSection;
  if (heroSrc) {
    merged.heroSection = {
      ...heroSrc,
      backgroundImages: imageList(stored.backgroundImages, base.heroSection?.backgroundImages),
    };
  }

  const managerSrc = dto.managerWordSection ?? base.managerWordSection;
  if (managerSrc) {
    merged.managerWordSection = {
      ...managerSrc,
      managerPicture: imageUrl(stored.managerPicture, base.managerWordSection?.managerPicture),
    };
  }

  const newsSrc = dto.newsSection ?? base.newsSection;
  if (newsSrc || Object.keys(stored.newsPictureByIndex).length > 0) {
    const oldCards = base.newsSection?.cards ?? [];
    const cards = (newsSrc?.cards ?? oldCards).map((card, index) => ({
      ...card,
      pictureLink: imageUrl(stored.newsPictureByIndex[index], oldCards[index]?.pictureLink),
    }));
    merged.newsSection = { ...(newsSrc ?? {}), cards };
  }

  // ponytail: partial until every section patched once
  return merged as MainPageContent;
}

@Injectable()
/** Reads and patches the singleton landing page document. */
export class MainCmsService {
  constructor(
    @Inject(DATABASE) private readonly db: Db,
    private readonly mediaService: MediaService,
  ) {}
  logger = new Logger(MainCmsService.name);

  /** Returns the landing page content, or null before the first patch. */
  async get(): Promise<MainPageContent | null> {
    try {
      const row = await this.db.query.mainPage.findFirst();
      return row?.content ?? null;
    } catch (error) {
      this.logger.error('error getting main page content', error);
      throw new InternalServerErrorException('Main page fetch failed', {
        cause: error,
      });
    }
  }

  /** Applies a partial body plus uploaded images over stored content. */
  async patch(body: Partial<MainPageContent>, files: MediaFile[]): Promise<{ status: string }> {
    // ponytail: fieldname convention — backgroundImages, managerPicture, newsPicture_<index>
    const stored: StoredFiles = { newsPictureByIndex: {} };
    for (const f of files) {
      const url = await this.mediaService.storeImage(f.buffer, f.mimetype);
      if (f.fieldname === 'backgroundImages')
        (stored.backgroundImages ??= []).push(url); // append or create the array
      else if (f.fieldname === 'managerPicture') stored.managerPicture = url;
      else {
        const m = /^newsPicture_(\d+)$/.exec(f.fieldname); // you pass newsPicture_{number} and the image belongs to the card with tht number
        if (m) stored.newsPictureByIndex[Number(m[1])] = url;
      }
    }

    this.logger.log(`media files stored and organized in an object`);

    // ponytail: uploads stay outside the try so media 400s are never wrapped in 500s
    try {
      const existing = await this.db.query.mainPage.findFirst();
      const merged = mergeMainPage(
        existing?.content as Partial<MainPageContent> | undefined,
        body as UpdateMainPageDto,
        stored,
      );

      this.logger.log('new page content constructed');

      if (existing)
        await this.db.update(mainPage).set({ content: merged }).where(eq(mainPage.id, existing.id));
      else await this.db.insert(mainPage).values({ content: merged });

      this.logger.log('new page contenct stored');

      return { status: 'true' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Main page patch failed', error);
      throw new InternalServerErrorException('Main page patch failed', {
        cause: error,
      });
    }
  }
}
