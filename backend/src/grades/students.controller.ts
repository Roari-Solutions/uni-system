import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { GrGurdGuard, type GrRequest } from 'src/gr-gurd/gr-gurd.guard';
import { GradesService } from './grades.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/grades.dto';

@Controller('gr/students')
@UseGuards(AuthGuard, GrGurdGuard)
export class StudenController {
  constructor(@Inject() private readonly gradesService: GradesService) {}

  @Get()
  async GetAllStudents(@Req() req: GrRequest) {
    return await this.gradesService.listStudents(req.grCaller);
  }

  @Post()
  async CreateStudent(@Body() dto: CreateStudentDto, @Req() req: GrRequest) {
    return await this.gradesService.createStudent(dto, req.grCaller);
  }

  @Patch(':uniNo')
  async UpdateStudent(
    @Param('uniNo') uniNo: string,
    @Body() dto: UpdateStudentDto,
    @Req() req: GrRequest,
  ) {
    return await this.gradesService.updateStudent(uniNo, dto, req.grCaller);
  }

  @Delete(':uniNo')
  async DeleteStudent(@Param('uniNo') uniNo: string, @Req() req: GrRequest) {
    return await this.gradesService.deleteStudent(uniNo, req.grCaller);
  }
}
