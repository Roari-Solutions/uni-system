import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { USER_MANAGEMENT, userScopeOf } from 'src/iam/permissions';
import {
  PermissionGuard,
  RequirePermission,
  type AccessRequest,
} from 'src/iam/permission.guard';
import { UsersService, type Manager } from './users.service';

/** The caller as a user manager: whose users and which roles they reach. */
const managerOf = (req: AccessRequest): Manager => ({
  userId: req.access.userId,
  ...userScopeOf(req.access.permissions),
});
import {
  CreateUserDto,
  ListUsersQueryDto,
  ResetPasswordDto,
  UpdateUserDto,
} from './dto/users.dto';

/**
 * User management. Each manager reaches only their own domain's users and
 * roles (see USER_SCOPES); a super admin reaches every domain.
 */
@Controller('admin')
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermission(...USER_MANAGEMENT)
export class UsersController {
  constructor(@Inject() private readonly usersService: UsersService) {}

  /** GET /admin/roles — the roles the caller sees, each marked with whether they may grant it. */
  @Get('roles')
  async GetRoles(@Req() req: AccessRequest) {
    return await this.usersService.listRoles(managerOf(req));
  }

  /** GET /admin/users — the users in the caller's domain. */
  @Get('users')
  async GetAllUsers(
    @Query() query: ListUsersQueryDto,
    @Req() req: AccessRequest,
  ) {
    return await this.usersService.listUsers(query, managerOf(req));
  }

  @Post('users')
  async CreateUser(@Body() dto: CreateUserDto, @Req() req: AccessRequest) {
    return await this.usersService.createUser(dto, managerOf(req));
  }

  @Patch('users/:id')
  async UpdateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: AccessRequest,
  ) {
    return await this.usersService.updateUser(id, dto, managerOf(req));
  }

  /** POST /admin/users/:id/password — the admin sets it and passes it on. */
  @Post('users/:id/password')
  async ResetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
    @Req() req: AccessRequest,
  ) {
    return await this.usersService.resetPassword(
      id,
      dto.password,
      managerOf(req),
    );
  }
}
