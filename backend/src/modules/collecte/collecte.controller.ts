import { Controller, Get } from '@nestjs/common';
import { CollecteService } from './collecte.service';

@Controller('collecte')
export class CollecteController {
  constructor(private readonly service: CollecteService) {}
  @Get('health') health() { return this.service.health(); }
}
