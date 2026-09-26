import {
  BadRequestException,
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
import { MAX_MEDIA_BYTES, type MediaFile } from 'src/media/media.service';
import { MainCmsService } from './main-cms.service';

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
  @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: MAX_MEDIA_BYTES } }))
  patchMain(
    @Body() body: BodyWrapper,
    @UploadedFiles() files: MediaFile[] = [],
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
    // missing/empty body is 400, never a silent no-op (matches about/scientific)
    if (!parsed || !Object.keys(parsed).length) throw new BadRequestException({ code: 'PI' });

    const dto: Partial<MainPageContent> = parsed.body ?? parsed;

    return this.mainCmsService.patch(dto, files);
  }
}
