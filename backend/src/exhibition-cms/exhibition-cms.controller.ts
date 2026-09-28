import {
  Controller,
  Get,
  Body,
  Patch,
  UseInterceptors,
  BadRequestException,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { ExhibitionCmsService } from './exhibition-cms.service';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { MAX_MEDIA_BYTES, MediaFile } from 'src/media/media.service';
import { ImagesExhibition } from 'src/content/entities/images-exhibition.entity';
import { AuthGuard } from 'src/auth/auth.guard';
import { DynamicContentGuard } from 'src/dynamic_content/dynamic_content.guard';

type ParsedExhibition = Partial<ImagesExhibition> & {
  body?: Partial<ImagesExhibition>;
};

interface BodyWrapper {
  body: ParsedExhibition;
}

@Controller('cms/exhibition')
export class ExhibitionCmsController {
  constructor(private readonly exhibitionCmsService: ExhibitionCmsService) {}

  @Get()
  findAll() {
    return this.exhibitionCmsService.get();
  }

  @Patch()
  @UseGuards(AuthGuard, DynamicContentGuard)
  @UseInterceptors(AnyFilesInterceptor({ limits: { fieldSize: MAX_MEDIA_BYTES } }))
  update(@Body() body: BodyWrapper, @UploadedFiles() files: MediaFile[]) {
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

    const dto: Partial<ImagesExhibition> = parsed.body ?? parsed;

    return this.exhibitionCmsService.update(dto, files);
  }
}
