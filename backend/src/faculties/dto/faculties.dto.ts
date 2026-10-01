import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsUUID,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { LocalizedNameDto } from 'src/common/dto/localized-name.dto';

/** Two capital letters; university numbers and curriculum codes are built from it. */
export const FACULTY_ABBREVIATION = /^[A-Z]{2}$/;

/** Body for PATCH /gr/faculties/:id: the faculty's own details. */
export class UpdateFacultyDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedNameDto)
  name?: LocalizedNameDto;

  @IsOptional()
  @Matches(FACULTY_ABBREVIATION)
  abbreviation?: string;
}

/** Body for creating a specialization: both names, and optionally its department. */
export class SpecializationDto {
  @ValidateNested()
  @Type(() => LocalizedNameDto)
  name!: LocalizedNameDto;

  /** Omitted or null: directly under the faculty. */
  @IsOptional()
  @ValidateIf((_dto: unknown, value: unknown) => value !== null)
  @IsUUID()
  departmentId?: string | null;
}

/**
 * Body for editing a specialization: a rename, a move to another department
 * (null: directly under the faculty), or both. A move takes the
 * specialization's students along, so it may need the caller's confirmation.
 */
export class UpdateSpecializationDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedNameDto)
  name?: LocalizedNameDto;

  @IsOptional()
  @ValidateIf((_dto: unknown, value: unknown) => value !== null)
  @IsUUID()
  departmentId?: string | null;

  @IsOptional()
  @IsBoolean()
  confirmOrphanedGrades?: boolean;
}

/** Body for creating or renaming a department: both names are required. */
export class DepartmentDto {
  @ValidateNested()
  @Type(() => LocalizedNameDto)
  name!: LocalizedNameDto;
}
