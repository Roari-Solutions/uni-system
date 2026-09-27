import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

/** Hero banner within partnerships page. */
export class PartnershipHeroSectionDto {
  @IsString()
  @IsNotEmpty()
  mainHead!: string;

  @IsOptional()
  @IsString()
  mainHead_ar?: string;

  @IsString()
  @IsNotEmpty()
  subHead!: string;

  @IsOptional()
  @IsString()
  subHead_ar?: string;

  @IsString()
  @IsNotEmpty()
  partnershipVision!: string;

  @IsOptional()
  @IsString()
  partnershipVision_ar?: string;
}

/** One stats entry. */
export class PartnershipStatDto {
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

/** One partnership entry. */
export class PartnershipEntryDto {
  @IsString()
  @IsNotEmpty()
  icon!: string;

  @IsString()
  @IsNotEmpty()
  tag!: string;

  @IsOptional()
  @IsString()
  tag_ar?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  title_ar?: string;

  @IsString()
  @IsNotEmpty()
  subTitle!: string;

  @IsOptional()
  @IsString()
  subTitle_ar?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  content_ar?: string;

  @IsString()
  @IsNotEmpty()
  field!: string;

  @IsOptional()
  @IsString()
  field_ar?: string;

  @IsString()
  @IsNotEmpty()
  date!: string;
}

/** Contacts card block. */
export class PartnershipContactsCardDto {
  @IsString()
  @IsNotEmpty()
  heading!: string;

  @IsOptional()
  @IsString()
  heading_ar?: string;

  @IsString()
  @IsNotEmpty()
  subHead!: string;

  @IsOptional()
  @IsString()
  subHead_ar?: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  location!: string;

  @IsOptional()
  @IsString()
  location_ar?: string;
}

/** Full partnerships page body; PATCH uses the partial child. */
export class CreatePartnershipDto {
  @ValidateNested()
  @Type(() => PartnershipHeroSectionDto)
  heroSection!: PartnershipHeroSectionDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartnershipStatDto)
  stats!: PartnershipStatDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartnershipEntryDto)
  partnerships!: PartnershipEntryDto[];

  @ValidateNested()
  @Type(() => PartnershipContactsCardDto)
  contactsCard!: PartnershipContactsCardDto;
}
