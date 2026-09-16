import { IsNotEmpty, IsString } from 'class-validator';

/** Login request body (email + password). */
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
