import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
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

  @IsString()
  @IsNotEmpty()
  phone!: string;
}

/** Full contact-us page body; PATCH uses the partial child. */
export class CreateContactUsCmDto {
  @IsString()
  @IsNotEmpty()
  contactData!: string;

  @IsString()
  @IsNotEmpty()
  location!: string;

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
