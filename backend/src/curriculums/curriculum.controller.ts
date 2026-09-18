import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CurriculumsService } from './curriculums.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { GrGurdGuard, type GrRequest } from 'src/gr-gurd/gr-gurd.guard';
import {
  CreateCurriculumDto,
  ListCurriculumsQueryDto,
  UpdateCurriculumDto,
} from './dto/curriculums.dto';

/** Curriculum endpoints (auth + faculty-scope guarded). */
@Controller('gr/curriculum')
@UseGuards(AuthGuard, GrGurdGuard)
export class CurriculumController {
  constructor(@Inject() private readonly curriculumsService: CurriculumsService) {}

  /** GET /gr/curriculum — list view rows, and the cascade's curriculum options. */
  @Get()
  async getAllCurriculums(@Req() req: GrRequest, @Query() query: ListCurriculumsQueryDto) {
    return await this.curriculumsService.listCurriculums(req.grCaller, query);
  }

  @Post()
  async CreateCurriculum(@Body() dto: CreateCurriculumDto, @Req() req: GrRequest) {
    return await this.curriculumsService.createCurriculum(dto, req.grCaller);
  }

  @Patch(':id')
  async UpdateCurriculum(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCurriculumDto,
    @Req() req: GrRequest,
  ) {
    return await this.curriculumsService.updateCurriculum(id, dto, req.grCaller);
  }

  @Delete(':id')
  async DeleteCurriculum(@Param('id', ParseUUIDPipe) id: string, @Req() req: GrRequest) {
    return await this.curriculumsService.deleteCurriculum(id, req.grCaller);
  }
}
