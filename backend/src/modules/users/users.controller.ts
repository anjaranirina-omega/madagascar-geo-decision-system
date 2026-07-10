import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users')
  findAllUsers() {
    return this.usersService.findAll();
  }

  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get('users/:id')
  findOneUser(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete('users/:id')
  removeUser(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Get('roles')
  findAllRoles() {
    return this.usersService.findAllRoles();
  }

  @Post('roles')
  createRole(@Body() dto: CreateRoleDto) {
    return this.usersService.createRole(dto);
  }
}
