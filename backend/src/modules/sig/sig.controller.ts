import { Controller, Get } from '@nestjs/common';
import { SigService } from './sig.service';

@Controller('sig')
export class SigController {
  constructor(private readonly service: SigService) {}
  @Get('health') health() { return this.service.health(); }
}
