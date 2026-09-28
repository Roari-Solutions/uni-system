import { Type } from 'class-transformer';
import { IsOptional, Matches, ValidateNested } from 'class-validator';
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

/** Body for creating or renaming a specialization: both names are required. */
export class SpecializationDto {
  @ValidateNested()
  @Type(() => LocalizedNameDto)
  name!: LocalizedNameDto;
}
