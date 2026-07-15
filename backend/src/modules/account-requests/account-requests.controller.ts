import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AccountRequestsService } from './account-requests.service';
import { CreateAccountRequestDto } from './dto/create-account-request.dto';
import { RejectAccountRequestDto } from './dto/reject-account-request.dto';

@Controller('account-requests')
export class AccountRequestsController {
  constructor(
    private readonly accountRequestsService: AccountRequestsService,
  ) {}

  /**
   * Public :
   * un visiteur non connecté peut demander un compte.
   */
  @Post()
  create(@Body() dto: CreateAccountRequestDto) {
    return this.accountRequestsService.create(dto);
  }

  /**
   * Admin uniquement :
   * consulter toutes les demandes.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll() {
    return this.accountRequestsService.findAll();
  }

  /**
   * Admin uniquement :
   * consulter une demande.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountRequestsService.findOne(id);
  }

  /**
   * Admin uniquement :
   * approuver une demande et créer le compte utilisateur.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.accountRequestsService.approve(id);
  }

  /**
   * Admin uniquement :
   * rejeter une demande.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectAccountRequestDto,
  ) {
    return this.accountRequestsService.reject(id, dto);
  }
}
