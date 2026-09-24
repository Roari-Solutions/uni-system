import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { DATABASE, type Db } from 'src/database/database.module';
import type { AboutUs } from 'src/content/entities/about-page.entity';
import type { UpdateAboutCmDto } from './dto/update-about-cm.dto';
import { MemoryFile } from 'src/main-cms/main-cms.service';
import { ImagesService } from 'src/images/images.service';
import { aboutPage } from 'schema';
import { eq } from 'drizzle-orm';

/** Reads and patches the singleton about page document. */
@Injectable()
export class AboutCmsService {
  private readonly logger = new Logger(AboutCmsService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Db,
    private readonly imagesService: ImagesService,
  ) {}
  /** Returns the about page content, or an empty page before the first patch. */
  async get() {
    try {
      const row = await this.db.query.aboutPage.findFirst();
      return row?.content ?? {};
    } catch (error) {
      this.logger.error('About fetch failed', error);
      throw new InternalServerErrorException('About fetch failed', {
        cause: error,
      });
    }
  }

  async saveImages(files: MemoryFile[] = []): Promise<{
    backgroundImages: string[];
    collegeImageCard: string[];
  }> {
    const backgroundImages: string[] = [];
    const collegeImageCard: string[] = [];
    let fileHash;
    for (const f of files) {
      if (f.fieldname === 'backgroundImages') {
        fileHash = await this.imagesService.store(f.buffer, f.mimetype);
        backgroundImages.push(fileHash);
      } else if (f.fieldname === 'collegeImageCard') {
        fileHash = await this.imagesService.store(f.buffer, f.mimetype);
        collegeImageCard.push(fileHash);
      } else {
        this.logger.warn(
          `Skipped upload: fieldname=${f.fieldname} originalname=${f.originalname} (want backgroundImages|collegeImageCard)`,
        );
      }
    }

    return { backgroundImages, collegeImageCard };
  }

  /** Merges a partial body plus uploaded images over stored content. */
  async update(dto: UpdateAboutCmDto, files: MemoryFile[]) {
    try {
      const existing = await this.db.query.aboutPage.findFirst();
    const base: Partial<AboutUs> = existing?.content ?? {};
    // ponytail: image slots are file-or-stored only — body paths ignored
    const stored = await this.saveImages(files);

    const newContent = { ...base, ...dto } as AboutUs;
    const heroSrc = dto.heroSection ?? base.heroSection;
    if (heroSrc) {
      newContent.heroSection = {
        ...heroSrc,
        backgroundImages: stored.backgroundImages.length
          ? stored.backgroundImages
          : (base.heroSection?.backgroundImages ?? []),
      };
    }
    newContent.collegeImageCard = stored.collegeImageCard.length
      ? stored.collegeImageCard
      : (base.collegeImageCard ?? []);

    if (existing)
      await this.db
        .update(aboutPage)
        .set({ content: newContent })
        .where(eq(aboutPage.id, existing.id));
    else await this.db.insert(aboutPage).values({ content: newContent });
    this.logger.log('About page patched');
    return `ok`;
    } catch (error) {
      this.logger.error('About patch failed', error);
      throw new InternalServerErrorException('About patch failed', {
        cause: error,
      });
    }
  }
}
