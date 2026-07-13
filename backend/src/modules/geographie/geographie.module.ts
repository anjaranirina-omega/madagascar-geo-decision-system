import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Commune } from './entities/commune.entity';
import { District } from './entities/district.entity';
import { Region } from './entities/region.entity';
import { GeographieController } from './geographie.controller';
import { GeographieService } from './geographie.service';

@Module({
  imports: [TypeOrmModule.forFeature([Region, District, Commune])],
  controllers: [GeographieController],
  providers: [GeographieService],
  exports: [GeographieService, TypeOrmModule],
})
export class GeographieModule {}
