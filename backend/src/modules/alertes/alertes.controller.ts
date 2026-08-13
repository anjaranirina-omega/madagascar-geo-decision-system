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
import { AlertesService } from './alertes.service';
import { CreateAlerteDto } from './dto/create-alerte.dto';
import { GenerateRiskAlertesDto } from './dto/generate-risk-alertes.dto';
import { GenerateWeatherRiskAlertDto } from './dto/generate-weather-risk-alert.dto';
import { GenerateOperationalAlertsDto } from './dto/generate-operational-alerts.dto';

@Controller('alertes')
export class AlertesController {
  constructor(private readonly alertesService: AlertesService) {}

  @Get('health')
  health() {
    return { module: 'alertes', status: 'ok' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DECIDEUR', 'ANALYSTE', 'AGENT_TERRAIN')
  @Get()
  findAll() {
    return this.alertesService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DECIDEUR', 'ANALYSTE', 'AGENT_TERRAIN')
  @Get('active')
  findActive() {
    return this.alertesService.findActive();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ANALYSTE')
  @Post()
  create(@Body() dto: CreateAlerteDto) {
    return this.alertesService.create(dto);
  }



  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ANALYSTE')
  @Post('auto-generate-weather-risk')
  autoGenerateWeatherRisk() {
    return this.alertesService.autoGenerateWeatherRiskAlerts();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ANALYSTE')
  @Post('generate-weather-risk')
  generateWeatherRisk(@Body() dto: GenerateWeatherRiskAlertDto) {
    return this.alertesService.generateWeatherRiskAlert(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ANALYSTE')
  @Post('generate-from-risk')
  generateFromRisk(@Body() dto: GenerateRiskAlertesDto) {
    return this.alertesService.generateFromRisk(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ANALYSTE')
  @Post('generate-operational-alerts')
  generateOperationalAlerts(@Body() dto: GenerateOperationalAlertsDto) {
    return this.alertesService.generateOperationalAlerts(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DECIDEUR', 'ANALYSTE', 'AGENT_TERRAIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.alertesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ANALYSTE', 'AGENT_TERRAIN')
  @Patch(':id/resolve')
  resolve(@Param('id') id: string) {
    return this.alertesService.resolve(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ANALYSTE')
  @Patch(':id/ignore')
  ignore(@Param('id') id: string) {
    return this.alertesService.ignore(id);
  }
}
