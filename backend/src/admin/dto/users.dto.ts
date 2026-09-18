import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

/** Minimum length for an admin-set password. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * The roles this dashboard may hand out. `site-content-employee` belongs to the
 * CMS and is deliberately not offered here, so it can be neither assigned nor
 * filtered on from the grades system.
 */
export const ASSIGNABLE_ROLES = ['admin', 'data-entry'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

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

  /** One of ASSIGNABLE_ROLES; anything else is rejected. */
  @IsIn(ASSIGNABLE_ROLES)
  role!: AssignableRole;

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
export class UpdateUserDto extends PartialType(CreateUserDto) {
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

/** Query filters for GET /admin/users. */
export class ListUsersQueryDto {
  @IsOptional()
  @IsUUID()
  facultyId?: string;

  @IsOptional()
  @IsIn(ASSIGNABLE_ROLES)
  role?: AssignableRole;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}
