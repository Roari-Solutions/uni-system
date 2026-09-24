import {
  BadRequestException,
  Controller,
  Get,
  Body,
  Patch,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { AboutCmsService } from './about-cms.service';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateAboutCmDto } from './dto/update-about-cm.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { DynamicContentGuard } from 'src/dynamic_content/dynamic_content.guard';
@Controller('/cms/about')
export class AboutCmsController {
  constructor(private readonly aboutCmsService: AboutCmsService) {}

  @Get()
  async findAll() {
    return await this.aboutCmsService.get();
  }

  @Patch()
  @UseGuards(AuthGuard, DynamicContentGuard)
  @UseInterceptors(AnyFilesInterceptor())
  update(
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files: Array<Express.Multer.File> = [],
  ) {
    // strict {body} wrapper only; missing/empty is 400, never a silent no-op
    const { body: payload } = Object.fromEntries(
      Object.entries(body ?? {}).map(([k, v]) => {
        if (typeof v !== 'string') return [k, v];
        try {
          return [k, JSON.parse(v)];
        } catch {
          return [k, v];
        }
      }),
    ) as { body?: UpdateAboutCmDto };
    if (!payload || !Object.keys(payload).length) throw new BadRequestException({ code: 'PI' });
    // global pipe skips Record params, so validate the resolved payload by hand
    const dto = plainToInstance(UpdateAboutCmDto, payload);
    if (validateSync(dto).length) throw new BadRequestException({ code: 'PI' });

    return this.aboutCmsService.update(dto, files);
  }
}
