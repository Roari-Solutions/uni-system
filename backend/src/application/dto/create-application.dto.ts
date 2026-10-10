import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

/** One application row, as the client sends it after reading the sheet. */
export class ApplicationRowDto {
  /** The row's place in the sheet, so the preview can point at it. */
  @IsInt()
  @Min(1)
  rowNumber!: number;

  @IsString()
  formNumber!: string;

  /** Full (quad) name in Arabic. */
  @IsString()
  name!: string;

  @IsString()
  schoolName!: string;

  @IsString()
  code!: string;

  /** Faculty name as the sheet wrote it; must resolve. */
  @IsString()
  faculty!: string;

  /** Optional; must belong to the faculty when given. */
  @IsOptional()
  @IsString()
  department?: string;

  /** Optional; must belong to the department/faculty when given. */
  @IsOptional()
  @IsString()
  specialization?: string;

  @IsString()
  acceptanceType!: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApplicationDto {}

/** Body for both bulk endpoints: the rows the preview is showing. */
export class BulkApplicationsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ApplicationRowDto)
  rows!: ApplicationRowDto[];
}
