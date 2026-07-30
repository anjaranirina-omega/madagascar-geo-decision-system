import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZoneIndicator } from './entities/zone-indicator.entity';
import { ZoneRiskIndicator } from './entities/zone-risk-indicator.entity';
import { ZoneIndicatorsController } from './zone-indicators.controller';
import { ZoneIndicatorsService } from './zone-indicators.service';

@Module({
  imports: [TypeOrmModule.forFeature([ZoneIndicator, ZoneRiskIndicator])],
  controllers: [ZoneIndicatorsController],
  providers: [ZoneIndicatorsService],
  exports: [ZoneIndicatorsService],
})
export class ZoneIndicatorsModule {}
