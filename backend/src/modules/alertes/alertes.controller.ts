import { Controller, Get } from '@nestjs/common';
import { AlertesService } from './alertes.service';

@Controller('alertes')
export class AlertesController {
  constructor(private readonly service: AlertesService) {}
  @Get('health') health() { return this.service.health(); }
}
