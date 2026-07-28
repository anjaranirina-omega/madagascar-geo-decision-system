import { Module } from '@nestjs/common';
import { AlertesModule } from '../alertes/alertes.module';
import { EtlController } from './etl.controller';
import { EtlScheduler } from './etl.scheduler';
import { EtlService } from './etl.service';

@Module({
  imports: [AlertesModule],
  controllers: [EtlController],
  providers: [EtlService, EtlScheduler],
  exports: [EtlService],
})
export class EtlModule {}
