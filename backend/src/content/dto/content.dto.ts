import { IsNotEmpty, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

/** Body for creating a news item. */
export class CreateNewsDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
}

/** Body for patching a news item (all fields optional). */
export class UpdateNewsDto extends PartialType(CreateNewsDto) {}

/** Body for creating a contact entry. */
export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  value!: string;

  @IsString()
  @IsNotEmpty()
  iconName!: string;
}
/** Body for patching a contact entry (all fields optional). */
export class UpdateContactDto extends PartialType(CreateContactDto) {}
