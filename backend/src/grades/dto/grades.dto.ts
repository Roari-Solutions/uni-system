import { IsIn, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import {
  ACADEMIC_YEARS,
  NormaliseAcademicYear,
  type AcademicYear,
} from 'src/common/academic-year';

/** Outcome of a single grade; always derived from the mark, never stored. */
export const GRADE_STATUSES = ['pass', 'fail'] as const;
export type GradeStatus = (typeof GRADE_STATUSES)[number];

/** Body for creating a grade. */
export class CreateGradeDto {
  @IsUUID()
  studentId!: string;

  @IsUUID()
  curriculumId!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  grade!: number;

  /**
   * Accepted so the entry form's status select does not fail validation, but
   * ignored: status is always derived from `grade`. See GradesService.PASS_MARK.
   */
  @IsOptional()
  @IsIn(GRADE_STATUSES)
  status?: GradeStatus;
}

/** Body for patching a grade (all fields optional). */
export class UpdateGradeDto extends PartialType(CreateGradeDto) {}

/** Query filters for GET /gr/grades, matching the list view's three filters. */
export class ListGradesQueryDto {
  @IsOptional()
  @IsUUID()
  facultyId?: string;

  @IsOptional()
  @IsUUID()
  curriculumId?: string;

  @IsOptional()
  @NormaliseAcademicYear()
  @IsIn(ACADEMIC_YEARS)
  academicYear?: AcademicYear;

  @IsOptional()
  @IsIn(GRADE_STATUSES)
  status?: GradeStatus;
}
