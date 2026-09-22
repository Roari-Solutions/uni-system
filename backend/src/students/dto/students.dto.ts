import { Type } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { OptionalEnglishNameDto } from 'src/common/dto/localized-name.dto';
import {
  ACADEMIC_YEARS,
  NormaliseAcademicYear,
  type AcademicYear,
} from 'src/common/academic-year';

/** Admission routes offered to students; mirrors ACCEPTANCE_TYPES in the views. */
export const ACCEPTANCE_TYPES = [
  'general',
  'special',
  'vacancies',
  'teachersChildren',
  'international',
  'arabCertificate',
] as const;
export type AcceptanceType = (typeof ACCEPTANCE_TYPES)[number];

/** Sudanese students carry a national ID; foreign students a passport number. */
export const NATIONALITIES = ['sudanese', 'foreign'] as const;
export type Nationality = (typeof NATIONALITIES)[number];

/** Outcome of a student's academic year; null until it is determined. */
export const STUDENT_STATUSES = ['success', 'repeat'] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

/** Body for creating a student. */
export class CreateStudentDto {
  @ValidateNested()
  @Type(() => OptionalEnglishNameDto)
  name!: OptionalEnglishNameDto;

  /** Letters, digits and dashes, e.g. "lw-26-9879698". */
  @IsString()
  @Matches(/^[A-Za-z0-9-]+$/)
  @MaxLength(32)
  uniNumber!: string;

  @IsIn(NATIONALITIES)
  nationality!: Nationality;

  /** Sudanese students only. Optional, but unique across students when supplied. */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  nationalId?: string;

  /** Foreign students only. Optional, but unique across students when supplied. */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  passportNumber?: string;

  @IsUUID()
  facultyId!: string;

  /** Calendar year of admission, e.g. "2026" — the only calendar year we store. */
  @IsString()
  @Matches(/^\d{4}$/)
  acceptanceYear!: string;

  @IsIn(ACCEPTANCE_TYPES)
  acceptanceType!: AcceptanceType;

  /** Study year 1-6, labelled "current academic year" in the views. */
  @NormaliseAcademicYear()
  @IsIn(ACADEMIC_YEARS)
  level!: AcademicYear;

  /** Omit or send null while the year's outcome is undetermined. */
  @IsOptional()
  @IsIn([...STUDENT_STATUSES, null])
  status?: StudentStatus | null;
}

/** Body for patching a student (all fields optional). */
export class UpdateStudentDto extends PartialType(CreateStudentDto) {}

/** Query filters for GET /gr/students, shared by the list view and the entry cascade. */
export class ListStudentsQueryDto {
  @IsOptional()
  @IsUUID()
  facultyId?: string;

  @IsOptional()
  @NormaliseAcademicYear()
  @IsIn(ACADEMIC_YEARS)
  level?: AcademicYear;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/)
  acceptanceYear?: string;

  /** Free-text match against either language's name or the university number. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}
