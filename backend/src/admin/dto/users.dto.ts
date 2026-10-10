import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { ALL_ROLES, type Role } from 'src/iam/permissions';

/** Minimum length for an admin-set password. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Any role name is accepted here; which ones a caller may actually grant
 * depends on their domain and is checked by the service.
 */
export const ROLE_NAMES = ALL_ROLES;

/** Body for creating a user. */
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  /** The login identifier. Stored in users.email; not required to be an address. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  email!: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxLength(128)
  password!: string;

  /**
   * On create, the user's roles. On update, their roles within the caller's
   * reach; roles outside it are kept as they are.
   */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ROLE_NAMES.length)
  @ArrayUnique()
  @IsIn(ROLE_NAMES, { each: true })
  roles!: Role[];

  /** Omit for staff who are not tied to a single faculty, such as admins. */
  @IsOptional()
  @IsUUID()
  facultyId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
}

/** Body for patching a user. Password and email are handled separately. */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['roles'] as const),
) {
  /**
   * The user's roles within the caller's reach; may be empty for a user who
   * keeps roles in another domain. Roles outside the caller's reach are kept.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(ROLE_NAMES.length)
  @ArrayUnique()
  @IsIn(ROLE_NAMES, { each: true })
  roles?: Role[];

  @IsOptional()
  @IsBoolean()
  suspended?: boolean;
}

/** Body for resetting a user's password. */
export class ResetPasswordDto {
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxLength(128)
  password!: string;
}

/** Body for giving an existing user one more role, found by their exact login. */
export class GrantRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  login!: string;

  @IsIn(ROLE_NAMES)
  role!: Role;
}

/** Query filters for GET /admin/users. */
export class ListUsersQueryDto {
  @IsOptional()
  @IsUUID()
  facultyId?: string;

  @IsOptional()
  @IsIn(ROLE_NAMES)
  role?: Role;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}
