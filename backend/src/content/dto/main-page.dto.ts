import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDefined,
  IsEmail,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import type { MainPageContent } from '../entities/main-page.entity';

/** Hero section: background image hashes, name, logo hash, motto. */
export class MainPageHeroDto implements Readonly<MainPageContent['hero']> {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  backgroundImages!: string[];

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  logo!: string;

  @IsString()
  @IsNotEmpty()
  motto!: string;
}

/** President section: name, quote, photo hash. */
export class MainPagePresidentDto implements Readonly<MainPageContent['president']> {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  quote!: string;

  @IsString()
  @IsNotEmpty()
  photo!: string;
}

/** Logo meaning section: vision, goals (bullet points), values, purpose. */
export class MainPageLogoMeaningDto implements Readonly<MainPageContent['logoMeaning']> {
  @IsString()
  @IsNotEmpty()
  vision!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  goals!: string[];

  @IsString()
  @IsNotEmpty()
  values!: string;

  @IsString()
  @IsNotEmpty()
  purpose!: string;
}

/** Contacts section: email, social profile URLs, phone numbers (international format). */
export class MainPageContactsDto implements Readonly<MainPageContent['contacts']> {
  @IsEmail()
  email!: string;

  @IsUrl()
  facebook!: string;

  @IsUrl()
  instagram!: string;

  @IsUrl()
  x!: string;

  @IsPhoneNumber()
  phone!: string;

  @IsPhoneNumber()
  whatsapp!: string;
}

/** Body for replacing the main page content. */
export class MainPageDto implements MainPageContent {
  @IsDefined()
  @ValidateNested()
  @Type(() => MainPageHeroDto)
  hero!: MainPageHeroDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => MainPagePresidentDto)
  president!: MainPagePresidentDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => MainPageLogoMeaningDto)
  logoMeaning!: MainPageLogoMeaningDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => MainPageContactsDto)
  contacts!: MainPageContactsDto;
}
