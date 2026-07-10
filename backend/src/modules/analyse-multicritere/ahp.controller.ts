import { Controller, Get } from '@nestjs/common';
import { AnalyseMulticritereService } from './ahp.service';

@Controller('ahp')
export class AnalyseMulticritereController {
  constructor(private readonly service: AnalyseMulticritereService) {}
  @Get('health') health() { return this.service.health(); }
}
