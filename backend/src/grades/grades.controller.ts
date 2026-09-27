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
import {
  CreateGradeDto,
  ListGradesQueryDto,
  PendingGradesQueryDto,
  ResolveCheatingDto,
  UpdateGradeDto,
} from './dto/grades.dto';

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

  /** GET /gr/grades/pending/:curriculumId — the entry sheet for one curriculum, marked students included. */
  @Get('pending/:curriculumId')
  async GetPendingGrades(
    @Req() req: GrRequest,
    @Param('curriculumId', ParseUUIDPipe) curriculumId: string,
    @Query() query: PendingGradesQueryDto,
  ) {
    return await this.gradesService.pendingGrades(curriculumId, req.grCaller, query.facultyId);
  }

  /** GET /gr/grades/student/:studentId — the student's current-year curriculums and marks. */
  @Get('student/:studentId')
  async GetStudentYearGrades(
    @Req() req: GrRequest,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return await this.gradesService.studentYearGrades(studentId, req.grCaller);
  }

  /** GET /gr/grades/student/:studentId/gpa — the student's semester GPAs and annual average. */
  @Get('student/:studentId/gpa')
  async GetStudentGpas(
    @Req() req: GrRequest,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return await this.gradesService.studentGpas(studentId, req.grCaller);
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

  /** POST /gr/grades/:id/resolve — decides a pending cheating case and its penalties. */
  @Post(':id/resolve')
  async ResolveCheating(
    @Req() req: GrRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveCheatingDto,
  ) {
    return await this.gradesService.resolveCheating(id, dto, req.grCaller);
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
