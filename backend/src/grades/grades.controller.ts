import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { GrGurdGuard, type GrRequest } from 'src/gr-gurd/gr-gurd.guard';
import { GradesService } from './grades.service';
import { CreateGradeDto, GradeIdentifiersDto, UpdateGradeDto } from './dto/grades.dto';
/** Grades/curriculums/students endpoints (auth + faculty-scope guarded). */
@Controller('gr/grades')
@UseGuards(AuthGuard, GrGurdGuard)
export class GradesController {
  constructor(@Inject() private readonly gradesService: GradesService) {}

  @Get()
  async GetAllGrades(@Req() req: GrRequest) {
    return await this.gradesService.listGrades(req.grCaller);
  }

  @Post()
  async CreateGrade(@Req() req: GrRequest, @Body() dto: CreateGradeDto) {
    return await this.gradesService.createGrade(dto, req.grCaller);
  }

  @Patch(':uniNo')
  async UpdateGrade(
    @Req() req: GrRequest,
    @Body() dto: UpdateGradeDto,
    @Param('uniNo') uniNo: string,
  ) {
    return await this.gradesService.updateGrade(uniNo, dto, req.grCaller);
  }

  @Delete('/all/:uniNo')
  async DeleteAllGrade(@Req() req: GrRequest, @Param('uniNo') uniNo: string) {
    return await this.gradesService.deleteAllGrades(uniNo, req.grCaller);
  }

  @Delete(':uniNo')
  async DeleteGrade(
    @Req() req: GrRequest,
    @Param('uniNo') uniNo: string,
    @Body() ids: GradeIdentifiersDto,
  ) {
    return await this.gradesService.deleteGrade(uniNo, ids, req.grCaller);
  }
}
