import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { CurriculumsService } from './curriculums.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { GrGurdGuard, type GrRequest } from 'src/gr-gurd/gr-gurd.guard';
import { CreateCurriculumDto, UpdateCurriculumDto } from './dto/curriculums.dto';

@Controller('gr/curriculum')
@UseGuards(AuthGuard, GrGurdGuard)
export class CurriculumController {
  constructor(@Inject() private readonly curriculumsService: CurriculumsService) {}
  @Get()
  async getAllCurriculums(@Req() req: GrRequest) {
    return await this.curriculumsService.listCurriculums(req.grCaller);
  }

  @Post()
  async CreateCurriculum(@Body() dto: CreateCurriculumDto, @Req() req: GrRequest) {
    return await this.curriculumsService.createCurriculum(dto, req.grCaller);
  }

  @Patch(':name/:faculty')
  async UpdateCurriculum(
    @Param('name') name: string,
    @Param('faculty') faculty: string,
    @Body() dto: UpdateCurriculumDto,
    @Req() req: GrRequest,
  ) {
    return await this.curriculumsService.updateCurriculum(name, faculty, dto, req.grCaller);
  }

  @Delete(':name/:faculty')
  async DeleteCurriculum(
    @Param('name') name: string,
    @Param('faculty') faculty: string,
    @Body() dto: UpdateCurriculumDto,
    @Req() req: GrRequest,
  ) {
    return await this.curriculumsService.deleteCurriculum(name, faculty, req.grCaller);
  }
}
