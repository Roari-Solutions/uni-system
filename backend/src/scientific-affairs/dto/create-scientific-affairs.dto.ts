import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from 'class-validator';

/** Hero counters block. */
export class SciHeroSectionDto {
  @IsString()
  @IsNotEmpty()
  subHead!: string;

  @IsOptional()
  @IsString()
  subHead_ar?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  content_ar?: string;

  @IsInt()
  @Min(0)
  regulationsCount!: number;

  @IsInt()
  @Min(0)
  academicDecisions!: number;

  @IsInt()
  @Min(0)
  academicUnit!: number;

  @IsInt()
  @Min(0)
  scientificService!: number;
}

/** Quote block. */
export class SciQuoteDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  content_ar?: string;

  @IsString()
  @IsNotEmpty()
  author!: string;

  @IsOptional()
  @IsString()
  author_ar?: string;

  @IsString()
  @IsNotEmpty()
  position!: string;

  @IsOptional()
  @IsString()
  position_ar?: string;
}

/** One vision card. */
export class SciVisionDto {
  @IsString()
  @IsNotEmpty()
  icon!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  title_ar?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  content_ar?: string;
}

/** One speciality entry. */
export class SciSpecialityDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  title_ar?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  content_ar?: string;
}

/** Link entry inside councils/committees. */
export class SciLinkDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsUrl()
  link!: string;
}

/** One council/committee entry. */
export class SciCouncilDto {
  @IsString()
  @IsNotEmpty()
  icon!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  name_ar?: string;

  @ValidateNested()
  @Type(() => SciLinkDto)
  link!: SciLinkDto;
}

/** One scientific service entry. */
export class SciServiceDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  content_ar?: string;
}

/** One downloadable resource; pdfLink is file-set, optional in body. */
export class SciResourceDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  title_ar?: string;

  @IsString()
  @IsNotEmpty()
  metadata!: string;

  @IsOptional()
  @IsString()
  metadata_ar?: string;

  @IsOptional()
  @IsString()
  pdfLink?: string;
}

/** Contacts block. */
export class SciContactsDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  workTime!: string;

  @IsOptional()
  @IsString()
  workTime_ar?: string;
}

/** Full scientific-affairs page body; PATCH uses the partial child. */
export class CreateScientificAffairsDto {
  @ValidateNested()
  @Type(() => SciHeroSectionDto)
  heroSection!: SciHeroSectionDto;

  @IsString()
  @IsNotEmpty()
  overview!: string;

  @IsOptional()
  @IsString()
  overview_ar?: string;

  @ValidateNested()
  @Type(() => SciQuoteDto)
  quote!: SciQuoteDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SciVisionDto)
  vision!: SciVisionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SciSpecialityDto)
  specialities!: SciSpecialityDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SciCouncilDto)
  councilsAndCommittees!: SciCouncilDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SciServiceDto)
  scientificServices!: SciServiceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SciResourceDto)
  resources!: SciResourceDto[];

  @ValidateNested()
  @Type(() => SciContactsDto)
  contacts!: SciContactsDto;
}
