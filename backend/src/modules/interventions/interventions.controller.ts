import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';
import { InterventionsService } from './interventions.service';

@Controller('interventions')
export class InterventionsController {
  constructor(private readonly interventionsService: InterventionsService) {}

  /**
   * Création d'une intervention.
   * Accessible aux administrateurs, analystes et décideurs.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ANALYSTE', 'DECIDEUR')
  @Post()
  create(@Body() dto: CreateInterventionDto) {
    return this.interventionsService.create(dto);
  }

  /**
   * Consultation des interventions.
   * Accessible à tout utilisateur authentifié.
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.interventionsService.findAll();
  }

  /**
   * Consultation des interventions par commune.
   * Accessible à tout utilisateur authentifié.
   */
  @UseGuards(JwtAuthGuard)
  @Get('commune/:communeId')
  findByCommune(@Param('communeId') communeId: string) {
    return this.interventionsService.findByCommune(communeId);
  }

  /**
   * Consultation du détail d'une intervention par ID.
   * Accessible à tout utilisateur authentifié.
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.interventionsService.findOne(id);
  }

  /**
   * Mise à jour d'une intervention.
   * Accessible aux administrateurs, analystes et décideurs.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ANALYSTE', 'DECIDEUR')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInterventionDto) {
    return this.interventionsService.update(id, dto);
  }

  /**
   * Suppression définitive d'une intervention.
   * Réservée exclusivement aux administrateurs.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.interventionsService.remove(id);
  }
}
