import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

/** Hero banner section; backgroundImages is file-set, optional in body. */
export class AboutHeroSectionDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  backgroundImages?: string[];

  @IsString()
  @IsNotEmpty()
  mainHead!: string;

  @IsString()
  @IsNotEmpty()
  subHead!: string;
}

/** One stats entry. */
export class AboutStatDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsNotEmpty()
  moreInfo!: string;
}

/** Principles inner card. */
export class AboutPrincipleCardDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
}

/** Principles block. */
export class AboutPrinciplesDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  subTitle!: string;

  @ValidateNested()
  @Type(() => AboutPrincipleCardDto)
  card!: AboutPrincipleCardDto;
}

/** Journey inner card. */
export class AboutJourneyCardDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsNotEmpty()
  year!: string;

  @IsString()
  @IsNotEmpty()
  tag!: string;
}

/** Journey block. */
export class AboutJourneyDto {
  @ValidateNested()
  @Type(() => AboutJourneyCardDto)
  card!: AboutJourneyCardDto;
}

/** Vision/message inner card. */
export class AboutVisionCardDto {
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

/** Vision and message block. */
export class AboutVisionAndMessageDto {
  @ValidateNested()
  @Type(() => AboutVisionCardDto)
  card!: AboutVisionCardDto;
}

/** One goal entry. */
export class AboutGoalDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
}

/** Academic principles block. */
export class AboutAcademicPrinciplesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AboutVisionCardDto)
  card!: AboutVisionCardDto[];
}

/** One given certificate. */
export class AboutCertificateDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  arTitle!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsNotEmpty()
  tag!: string;

  @IsString()
  @IsNotEmpty()
  miniTag!: string;
}

/** Full about page body; PATCH uses the partial child. */
export class CreateAboutCmDto {
  @ValidateNested()
  @Type(() => AboutHeroSectionDto)
  heroSection!: AboutHeroSectionDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AboutStatDto)
  stats!: AboutStatDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  collegeImageCard?: string[];

  @ValidateNested()
  @Type(() => AboutPrinciplesDto)
  principles!: AboutPrinciplesDto;

  @ValidateNested()
  @Type(() => AboutJourneyDto)
  journey!: AboutJourneyDto;

  @ValidateNested()
  @Type(() => AboutVisionAndMessageDto)
  visionAndMessage!: AboutVisionAndMessageDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AboutGoalDto)
  goals!: AboutGoalDto[];

  @ValidateNested()
  @Type(() => AboutAcademicPrinciplesDto)
  academicPrinciples!: AboutAcademicPrinciplesDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AboutCertificateDto)
  givenCertificates!: AboutCertificateDto[];

  @IsString()
  @IsNotEmpty()
  admissionTitle!: string;

  @IsString()
  @IsNotEmpty()
  admissionSubTitle!: string;

  @IsString()
  @IsNotEmpty()
  admissionGuidelines!: string;
}
