import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

function imageFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  if (!file.mimetype.match(/^image\/(jpeg|jpg|png|webp)$/)) {
    return callback(
      new BadRequestException(
        'Seuls les fichiers image JPG, PNG ou WEBP sont autorisés.',
      ),
      false,
    );
  }

  callback(null, true);
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
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

  @Post('users/:id/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.updateAvatar(id, file);
  }

  @Delete('users/:id/avatar')
  removeAvatar(@Param('id') id: string) {
    return this.usersService.removeAvatar(id);
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
