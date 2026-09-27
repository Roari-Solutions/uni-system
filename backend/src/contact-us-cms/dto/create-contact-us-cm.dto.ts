import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

/** Public/documentation email pair. */
export class ContactEmailDto {
  @IsEmail()
  public!: string;

  @IsEmail()
  documentation!: string;
}

/** One opening-hours row. */
export class OpenTimeDto {
  @IsString()
  @IsNotEmpty()
  day!: string;

  @IsOptional()
  @IsString()
  day_ar?: string;

  @IsString()
  @IsNotEmpty()
  start!: string;

  @IsString()
  @IsNotEmpty()
  end!: string;
}

/** One phone entry. */
export class PhoneDto {
  @IsString()
  @IsNotEmpty()
  entity!: string;

  @IsOptional()
  @IsString()
  entity_ar?: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;
}

/** Full contact-us page body; PATCH uses the partial child. */
export class CreateContactUsCmDto {
  @IsString()
  @IsNotEmpty()
  contactData!: string;

  @IsOptional()
  @IsString()
  contactData_ar?: string;

  @IsString()
  @IsNotEmpty()
  location!: string;

  @IsOptional()
  @IsString()
  location_ar?: string;

  @ValidateNested()
  @Type(() => ContactEmailDto)
  email!: ContactEmailDto;

  @ValidateNested({ each: true })
  @Type(() => OpenTimeDto)
  openTimes!: OpenTimeDto[];

  @ValidateNested({ each: true })
  @Type(() => PhoneDto)
  phones!: PhoneDto[];

  @IsString()
  @IsNotEmpty()
  transparencyAndAcademics!: string;
}
