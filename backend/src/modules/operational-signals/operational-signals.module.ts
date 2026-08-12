import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationalRiskSignal } from './entities/operational-risk-signal.entity';
import { OperationalSignalsController } from './operational-signals.controller';
import { OperationalSignalsService } from './operational-signals.service';

@Module({
  imports: [TypeOrmModule.forFeature([OperationalRiskSignal])],
  controllers: [OperationalSignalsController],
  providers: [OperationalSignalsService],
  exports: [OperationalSignalsService],
})
export class OperationalSignalsModule {}
