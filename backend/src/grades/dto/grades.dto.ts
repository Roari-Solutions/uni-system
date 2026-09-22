import { IsIn, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import {
  ACADEMIC_YEARS,
  NormaliseAcademicYear,
  type AcademicYear,
} from 'src/common/academic-year';
import { LETTER_GRADES, type LetterGrade } from '../letter-grade';

/** Mirrors seatingStatusEnum in the schema. */
export const SEATING_STATUSES = ['attended', 'absent', 'cheating'] as const;
export type SeatingStatus = (typeof SEATING_STATUSES)[number];

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

  @IsIn(SEATING_STATUSES)
  seatingStatus!: SeatingStatus;
}

/** Body for patching a grade (all fields optional). */
export class UpdateGradeDto extends PartialType(CreateGradeDto) {}

/** Query filters for GET /gr/grades, matching the list view's filters. */
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

  /** A letter from the scale; see letterOf. */
  @IsOptional()
  @IsIn(LETTER_GRADES)
  letter?: LetterGrade;
}
