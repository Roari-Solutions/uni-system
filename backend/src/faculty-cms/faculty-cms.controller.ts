import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AuthGuard } from 'src/auth/auth.guard';
import { FacultyPageContent } from 'src/content/entities/faculty-page.entity';
import { DynamicContentGuard } from 'src/dynamic_content/dynamic_content.guard';
import { MAX_MEDIA_BYTES, type MediaFile } from 'src/media/media.service';
import { UpdateFacultyPageDto } from './dto/update-faculty-page.dto';
import { FacultyCmsService } from './faculty-cms.service';

type ParsedFacultyPage = Partial<FacultyPageContent> & {
  body?: Partial<FacultyPageContent>;
};

@Controller('cms/faculty')
/** Faculty-scoped read (public) + guarded partial updates with image upload. */
export class FacultyCmsController {
  constructor(private readonly facultyCmsService: FacultyCmsService) {}

  /** Missing facultyId — bad request per spec (GET /cms/faculty without param). */
  @Get()
  getMissing(): never {
    throw new BadRequestException({ code: 'MA' });
  }

  /** Missing facultyId — bad request per spec (PATCH /cms/faculty without param). */
  @Patch()
  @HttpCode(HttpStatus.OK)
  patchMissing(): never {
    throw new BadRequestException({ code: 'MA' });
  }

  /** GET /cms/faculty/:facultyId — public faculty page content. */
  @Get(':facultyId')
  getOne(
    @Param('facultyId', new ParseUUIDPipe({ version: '4' })) facultyId: string,
  ): Promise<FacultyPageContent | null> {
    return this.facultyCmsService.get(facultyId);
  }

  /** PATCH /cms/faculty/:facultyId — merges content; uploaded files win image slots. */
  @Patch(':facultyId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, DynamicContentGuard)
  @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: MAX_MEDIA_BYTES } }))
  patchOne(
    @Param('facultyId', new ParseUUIDPipe({ version: '4' })) facultyId: string,
    @Body() body: ParsedFacultyPage,
    @UploadedFiles() files: MediaFile[] = [],
  ): Promise<{ status: string }> {
    const outer = Object.fromEntries(
      Object.entries(body ?? {}).map(([k, v]) => {
        if (typeof v !== 'string') return [k, v];
        try {
          return [k, JSON.parse(v)];
        } catch {
          return [k, v];
        }
      }),
    ) as ParsedFacultyPage;

    const payload = (outer as ParsedFacultyPage).body ?? outer;
    if (!payload || Object.keys(payload).length === 0)
      throw new BadRequestException({ code: 'PI' });

    const dto = plainToInstance(UpdateFacultyPageDto, payload);
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: false,
    });

    if (errors.length) throw new BadRequestException({ code: 'PI' });

    return this.facultyCmsService.patch(facultyId, dto, files);
  }
}
