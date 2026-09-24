import { BadRequestException, Controller, Get, Body, Patch, UseInterceptors, UploadedFiles, UseGuards } from '@nestjs/common';
import { ScientificAffairsService } from './scientific-affairs.service';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateScientificAffairsDto } from './dto/update-scientific-affairs.dto';
import { type MemoryFile } from 'src/main-cms/main-cms.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { DynamicContentGuard } from 'src/dynamic_content/dynamic_content.guard';

@Controller('cms/scientific')
export class ScientificAffairsController {
  constructor(private readonly scientificAffairsService: ScientificAffairsService) {}
  @Get()
  async findAll() {
    return await this.scientificAffairsService.get();
  }

  @Patch()
  @UseGuards(AuthGuard,DynamicContentGuard)
  @UseInterceptors(AnyFilesInterceptor())
  async update(@Body() body: Record<string, unknown>, @UploadedFiles() files: MemoryFile[] = []) {
    const parsed = Object.fromEntries(
      Object.entries(body ?? {}).map(([k, v]) => {
        if (typeof v !== 'string') return [k, v];
        try {
          return [k, JSON.parse(v)];
        } catch {
          return [k, v];
        }
      }),
    ) as Record<string, unknown> & { body?: UpdateScientificAffairsDto };
    // strict {body} wrapper only; missing/empty is 400, never a silent no-op
    const payload = parsed.body;
    if (!payload || !Object.keys(payload).length) throw new BadRequestException({ code: 'PI' });
    // global pipe skips Record params, so validate the resolved payload by hand. from json to class instance
    const dto = plainToInstance(UpdateScientificAffairsDto, payload);
    if (validateSync(dto).length) throw new BadRequestException({ code: 'PI' });

    return await this.scientificAffairsService.update(dto, files);
  }
}
