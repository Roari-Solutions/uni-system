import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from 'src/auth/auth.guard';
import { MainPageContent } from 'src/content/entities/main-page.entity';
import { DynamicContentGuard } from 'src/dynamic_content/dynamic_content.guard';
import { MAX_IMAGE_BYTES } from 'src/images/images.service';
import { MainCmsService, type MemoryFile } from './main-cms.service';

type ParsedMainPage = Partial<MainPageContent> & {
  body?: Partial<MainPageContent>;
};

interface BodyWrapper {
  body: ParsedMainPage;
}

@Controller('cms')
/** Public landing page read; guarded partial updates with image uploads. */
export class MainCmsController {
  constructor(private readonly mainCmsService: MainCmsService) {}

  /** GET /CMS/main — public landing page content. */
  @Get('main')
  getMain(): Promise<MainPageContent | null> {
    return this.mainCmsService.get();
  }

  /** PATCH /CMS/main — merges `content` sections; uploaded files win image slots. */
  @Patch('main')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, DynamicContentGuard)
  @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: MAX_IMAGE_BYTES } }))
  patchMain(
    @Body() body: BodyWrapper,
    @UploadedFiles() files: MemoryFile[] = [],
  ): Promise<{ status: string }> {
    // parese the body
    const { body: parsed = {} } = Object.fromEntries(
      Object.entries(body ?? {}).map(([k, v]) => {
        if (typeof v !== 'string') return [k, v];
        try {
          return [k, JSON.parse(v)];
        } catch {
          return [k, v];
        }
      }),
    ) as BodyWrapper;

    const dto: Partial<MainPageContent> = parsed.body ?? parsed;

    return this.mainCmsService.patch(dto, files);
  }
}
