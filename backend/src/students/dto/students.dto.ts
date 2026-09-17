import { IsNotEmpty, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

/** Body for creating a student. */
export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  year!: string;

  @IsString()
  @IsNotEmpty()
  uniNo!: string;

  @IsString()
  @IsNotEmpty()
  acceptanceType!: string;

  @IsString()
  @IsNotEmpty()
  faculty!: string;
}

/** Body for patching a student (all fields optional). */
export class UpdateStudentDto extends PartialType(CreateStudentDto) {}
