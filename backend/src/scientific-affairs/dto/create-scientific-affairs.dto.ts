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
  subHeading!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

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

  @IsString()
  @IsNotEmpty()
  author!: string;

  @IsString()
  @IsNotEmpty()
  position!: string;
}

/** One vision card. */
export class SciVisionDto {
  @IsString()
  @IsNotEmpty()
  icon!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
}

/** One speciality entry. */
export class SciSpecialityDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
}

/** Link entry inside councils/committees. */
export class SciLinkDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

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

  @ValidateNested()
  @Type(() => SciLinkDto)
  link!: SciLinkDto;
}

/** One scientific service entry. */
export class SciServiceDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
}

/** One downloadable resource; pdfLink is file-set, optional in body. */
export class SciResourceDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  metadata!: string;

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
}

/** Full scientific-affairs page body; PATCH uses the partial child. */
export class CreateScientificAffairsDto {
  @ValidateNested()
  @Type(() => SciHeroSectionDto)
  heroSection!: SciHeroSectionDto;

  @IsString()
  @IsNotEmpty()
  overview!: string;

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
