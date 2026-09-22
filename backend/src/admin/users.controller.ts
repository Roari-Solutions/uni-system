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
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, CurrentUser, type JwtPayload } from 'src/auth/auth.guard';
import { AdminGuard } from './admin.guard';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  ListUsersQueryDto,
  ResetPasswordDto,
  UpdateUserDto,
} from './dto/users.dto';

/** User management. Admin only. */
@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class UsersController {
  constructor(@Inject() private readonly usersService: UsersService) {}

  /** GET /admin/roles — the roles an admin may assign. */
  @Get('roles')
  async GetRoles() {
    return await this.usersService.listRoles();
  }

  /** GET /admin/users — list view rows. */
  @Get('users')
  async GetAllUsers(@Query() query: ListUsersQueryDto) {
    return await this.usersService.listUsers(query);
  }

  @Post('users')
  async CreateUser(@Body() dto: CreateUserDto) {
    return await this.usersService.createUser(dto);
  }

  @Patch('users/:id')
  async UpdateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() caller: JwtPayload,
  ) {
    return await this.usersService.updateUser(id, dto, caller.sub);
  }

  /** POST /admin/users/:id/password — the admin sets it and passes it on. */
  @Post('users/:id/password')
  async ResetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return await this.usersService.resetPassword(id, dto.password);
  }
}
