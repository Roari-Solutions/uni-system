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
import { CrewPage } from 'src/content/entities/crew-page.entity';
import { DynamicContentGuard } from 'src/dynamic_content/dynamic_content.guard';
import { MAX_MEDIA_BYTES, type MediaFile } from 'src/media/media.service';
import { CrewCmsService } from './crew-cms.service';
import { UpdateCrewCmDto } from './dto/update-crew-cm.dto';

type ParsedCrewPage = Partial<CrewPage> & {
  body?: Partial<CrewPage>;
};

/** Public reads, guarded writes for per-crew pages. */
@Controller('cms/crew')
export class CrewCmsController {
  constructor(private readonly crewCmsService: CrewCmsService) {}

  @Get(':crewId')
  async getOne(@Param('crewId', new ParseUUIDPipe({ version: '4' })) crewId: string) {
    return await this.crewCmsService.get(crewId);
  }

  @Patch(':crewId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, DynamicContentGuard)
  @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: MAX_MEDIA_BYTES } }))
  async patchOne(
    @Param('crewId', new ParseUUIDPipe({ version: '4' })) crewId: string,
    @Body() body: ParsedCrewPage,
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
    ) as ParsedCrewPage;

    const parsed = outer.body ?? outer;

    // missing/empty body is 400, never a silent no-op (matches main/about/scientific)
    if (!parsed || !Object.keys(parsed).length) throw new BadRequestException({ code: 'PI' });

    const dto = plainToInstance(UpdateCrewCmDto, parsed);
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length) throw new BadRequestException({ code: 'PI' });

    return await this.crewCmsService.patch(crewId, dto, files);
  }
}
