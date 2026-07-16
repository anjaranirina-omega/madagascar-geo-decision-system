import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RasterLayer } from './entities/raster-layer.entity';
import { RastersController } from './rasters.controller';
import { RastersService } from './rasters.service';

@Module({
  imports: [TypeOrmModule.forFeature([RasterLayer])],
  controllers: [RastersController],
  providers: [RastersService],
  exports: [RastersService],
})
export class RastersModule {}
