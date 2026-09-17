import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { GradesService } from './grades.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { GrGurdGuard, type GrRequest } from 'src/gr-gurd/gr-gurd.guard';
import { CreateCurriculumDto, UpdateCurriculumDto } from './dto/grades.dto';

@Controller('gr/curriculum')
@UseGuards(AuthGuard, GrGurdGuard)
export class CurriculumController {
  constructor(@Inject() private readonly gradesService: GradesService) {}
  @Get()
  async getAllCurriculums(@Req() req: GrRequest) {
    return await this.gradesService.listCurriculums(req.grCaller);
  }

  @Post()
  async CreateCurriculum(@Body() dto: CreateCurriculumDto, @Req() req: GrRequest) {
    return await this.gradesService.createCurriculum(dto, req.grCaller);
  }

  @Patch(':name/:faculty')
  async UpdateCurriculum(
    @Param('name') name: string,
    @Param('faculty') faculty: string,
    @Body() dto: UpdateCurriculumDto,
    @Req() req: GrRequest,
  ) {
    return await this.gradesService.updateCurriculum(name, faculty, dto, req.grCaller);
  }

  @Delete(':name/:faculty')
  async DeleteCurriculum(
    @Param('name') name: string,
    @Param('faculty') faculty: string,
    @Body() dto: UpdateCurriculumDto,
    @Req() req: GrRequest,
  ) {
    return await this.gradesService.deleteCurriculum(name, faculty, req.grCaller);
  }
}
