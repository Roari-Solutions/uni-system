import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from 'src/admin/dto/users.dto';

/** Body for PATCH /auth/me: the caller's own name, login and password. */
export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  /** The login identifier. Stored in users.email; not required to be an address. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxLength(128)
  newPassword?: string;

  /** Required for any change, so an unattended session cannot take the account over. */
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;
}
