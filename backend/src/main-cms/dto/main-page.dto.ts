import { Type, plainToInstance } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  validateSync,
  type ValidationError,
} from 'class-validator';
import { BadRequestException } from '@nestjs/common';

/** Single link entry in the footer link lists. */
export class LinkDto {
  @IsString()
  @IsNotEmpty()
  link!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

/** Hero banner section. */
export class HeroSectionDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  backgroundImages?: string[];

  @IsString()
  @IsNotEmpty()
  mainHeading!: string;

  @IsString()
  @IsNotEmpty()
  subHeading!: string;
}

/** Dean's word section. */
export class ManagerWordSectionDto {
  @IsString()
  @IsNotEmpty()
  managerName!: string;

  @IsString()
  @IsNotEmpty()
  managerWord!: string;

  @IsOptional()
  @IsString()
  managerPicture?: string;
}

/** One vision/mission/values card. */
export class VisionCardDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
}

/** Vision/mission/values section. */
export class VisionSectionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VisionCardDto)
  card!: VisionCardDto[];
}

/** One news card. */
export class NewsCardDto {
  @IsString()
  @IsNotEmpty()
  tag!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  pictureLink?: string;
}

/** News carousel section. */
export class NewsSectionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NewsCardDto)
  cards!: NewsCardDto[];
}

/** Public stats counters. */
export class AnalyticsDto {
  @IsInt()
  @Min(0)
  researchCenters!: number;

  @IsInt()
  @Min(0)
  employeesNumber!: number;

  @IsInt()
  @Min(0)
  collegeCount!: number;

  @IsInt()
  @Min(0)
  studentsCount!: number;

  @IsInt()
  @Min(0)
  femaleStudents!: number;

  @IsInt()
  @Min(0)
  maleStudents!: number;
}

/** Contact/location block inside the footer. */
export class ContactLocationDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  box!: string;

  @IsString()
  @IsNotEmpty()
  location!: string;
}

/** Footer section. */
export class FooterSectionDto {
  @ValidateNested()
  @Type(() => ContactLocationDto)
  contactsAndLocationSection!: ContactLocationDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkDto)
  importantLinks!: LinkDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkDto)
  collegesAndCenters!: LinkDto[];
}

/** PATCH /CMS/main body: every section optional, images optional within. */
export class UpdateMainPageDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => HeroSectionDto)
  heroSection?: HeroSectionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ManagerWordSectionDto)
  managerWordSection?: ManagerWordSectionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => VisionSectionDto)
  visionSection?: VisionSectionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => NewsSectionDto)
  newsSection?: NewsSectionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AnalyticsDto)
  analytics?: AnalyticsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FooterSectionDto)
  footerSection?: FooterSectionDto;
}
