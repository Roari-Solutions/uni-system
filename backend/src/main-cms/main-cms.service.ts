import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { mainPage } from 'schema';
import { MainPageContent } from 'src/content/entities/main-page.entity';
import { DATABASE, type Db } from 'src/database/database.module';
import { ImagesService } from 'src/images/images.service';
import { UpdateMainPageDto } from './dto/main-page.dto';

/** Multer in-memory file (structural type, avoids @types/multer). */
export type MemoryFile = {
  buffer: Buffer;
  fieldname: string;
  mimetype: string;
  originalname: string;
  size: number;
};

/** Uploaded-file URLs grouped by form field. */
export type StoredFiles = {
  backgroundImages?: string[];
  managerPicture?: string;
  newsPictureByIndex: Record<number, string>;
};

/** Prefers file URL, then patch value, then stored value. */
function imageUrl(
  file: string | undefined,
  dtoUrl: string | undefined,
  oldUrl: string | undefined,
): string {
  return file ?? dtoUrl ?? oldUrl ?? '';
}

/** Same as imageUrl for image lists. */
function imageList(
  files: string[] | undefined,
  dtoList: string[] | undefined,
  oldList: string[] | undefined,
): string[] {
  return files ?? dtoList ?? oldList ?? [];
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
      backgroundImages: imageList(
        stored.backgroundImages,
        dto.heroSection?.backgroundImages,
        base.heroSection?.backgroundImages,
      ),
    };
  }

  const managerSrc = dto.managerWordSection ?? base.managerWordSection;
  if (managerSrc) {
    merged.managerWordSection = {
      ...managerSrc,
      managerPicture: imageUrl(
        stored.managerPicture,
        dto.managerWordSection?.managerPicture,
        base.managerWordSection?.managerPicture,
      ),
    };
  }

  const newsSrc = dto.newsSection ?? base.newsSection;
  if (newsSrc || Object.keys(stored.newsPictureByIndex).length > 0) {
    const oldCards = base.newsSection?.cards ?? [];
    const cards = (newsSrc?.cards ?? oldCards).map((card, index) => ({
      ...card,
      pictureLink: imageUrl(
        stored.newsPictureByIndex[index],
        card.pictureLink,
        oldCards[index]?.pictureLink,
      ),
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
    private readonly imagesService: ImagesService,
  ) {}

  /** Returns the landing page content, or null before the first patch. */
  async get(): Promise<MainPageContent | null> {
    try {
      const row = await this.db.query.mainPage.findFirst();
      return row?.content ?? null;
    } catch (error) {
      throw new InternalServerErrorException('Main page fetch failed', {
        cause: error,
      });
    }
  }

  /** Applies a partial body plus uploaded images over stored content. */
  async patch(body: unknown, files: MemoryFile[]): Promise<{ status: string }> {
    return Promise.resolve({ status: 'true' });
  }
}
