import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { GrGurdGuard, type GrRequest } from 'src/gr-gurd/gr-gurd.guard';
import { StudentsService } from './students.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/students.dto';

@Controller('gr/students')
@UseGuards(AuthGuard, GrGurdGuard)
export class StudentsController {
  constructor(@Inject() private readonly studentsService: StudentsService) {}

  @Get()
  async GetAllStudents(@Req() req: GrRequest) {
    return await this.studentsService.listStudents(req.grCaller);
  }

  @Post()
  async CreateStudent(@Body() dto: CreateStudentDto, @Req() req: GrRequest) {
    return await this.studentsService.createStudent(dto, req.grCaller);
  }

  @Patch(':uniNo')
  async UpdateStudent(
    @Param('uniNo') uniNo: string,
    @Body() dto: UpdateStudentDto,
    @Req() req: GrRequest,
  ) {
    return await this.studentsService.updateStudent(uniNo, dto, req.grCaller);
  }

  @Delete(':uniNo')
  async DeleteStudent(@Param('uniNo') uniNo: string, @Req() req: GrRequest) {
    return await this.studentsService.deleteStudent(uniNo, req.grCaller);
  }
}
