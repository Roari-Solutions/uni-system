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
import { AuthGuard } from 'src/auth/auth.guard';
import { GrGurdGuard, type GrRequest } from 'src/gr-gurd/gr-gurd.guard';
import { GradesService } from './grades.service';
import { CreateGradeDto, ListGradesQueryDto, UpdateGradeDto } from './dto/grades.dto';

/** Grade endpoints (auth + faculty-scope guarded). */
@Controller('gr/grades')
@UseGuards(AuthGuard, GrGurdGuard)
export class GradesController {
  constructor(@Inject() private readonly gradesService: GradesService) {}

  /** GET /gr/grades — list view rows, already filtered. */
  @Get()
  async GetAllGrades(@Req() req: GrRequest, @Query() query: ListGradesQueryDto) {
    return await this.gradesService.listGrades(req.grCaller, query);
  }

  /** GET /gr/grades/pending/:curriculumId — the entry sheet for one curriculum. */
  @Get('pending/:curriculumId')
  async GetPendingGrades(
    @Req() req: GrRequest,
    @Param('curriculumId', ParseUUIDPipe) curriculumId: string,
  ) {
    return await this.gradesService.pendingGrades(curriculumId, req.grCaller);
  }

  @Post()
  async CreateGrade(@Req() req: GrRequest, @Body() dto: CreateGradeDto) {
    return await this.gradesService.createGrade(dto, req.grCaller);
  }

  @Patch(':id')
  async UpdateGrade(
    @Req() req: GrRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGradeDto,
  ) {
    return await this.gradesService.updateGrade(id, dto, req.grCaller);
  }

  /** DELETE /gr/grades/all/:studentId — clears one student's grades and results. */
  @Delete('all/:studentId')
  async DeleteAllGrades(
    @Req() req: GrRequest,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return await this.gradesService.deleteAllGrades(studentId, req.grCaller);
  }

  @Delete(':id')
  async DeleteGrade(@Req() req: GrRequest, @Param('id', ParseUUIDPipe) id: string) {
    return await this.gradesService.deleteGrade(id, req.grCaller);
  }
}
