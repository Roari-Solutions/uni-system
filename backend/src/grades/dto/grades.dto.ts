import { IsBoolean, IsIn, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { SUSPENSION_YEARS, type SuspensionYears } from 'src/common/student-standing';
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

  /** Cheating only: staff have decided the case, so the mark counts toward the year. */
  @IsOptional()
  @IsBoolean()
  cheatingResolved?: boolean;
}

/** Body for patching a grade (all fields optional). */
export class UpdateGradeDto extends PartialType(CreateGradeDto) {}

/** How a cheating case ends: accept the mark, or keep the case and score 0. */
export const CHEATING_OUTCOMES = ['accept', 'zero'] as const;
export type CheatingOutcome = (typeof CHEATING_OUTCOMES)[number];

/** Body for POST /gr/grades/:id/resolve: the decision plus at most one penalty on the student. */
export class ResolveCheatingDto {
  @IsIn(CHEATING_OUTCOMES)
  outcome!: CheatingOutcome;

  @IsBoolean()
  warning!: boolean;

  /** Academic years the student sits out; omit for no suspension. */
  @IsOptional()
  @IsIn(SUSPENSION_YEARS)
  suspensionYears?: SuspensionYears;

  /** Dismissal ends the student's time at the university; it cannot come with a suspension. */
  @IsBoolean()
  dismiss!: boolean;
}

/** Query for GET /gr/grades/pending/:curriculumId. */
export class PendingGradesQueryDto {
  /**
   * The faculty whose students the sheet lists. A university requirement is
   * offered by every faculty; omitted, an admin gets them all.
   */
  @IsOptional()
  @IsUUID()
  facultyId?: string;
}

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

  @IsOptional()
  @IsIn(SEATING_STATUSES)
  seatingStatus?: SeatingStatus;
}
