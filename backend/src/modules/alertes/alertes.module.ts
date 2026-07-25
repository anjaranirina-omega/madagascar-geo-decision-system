import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alerte } from './entities/alerte.entity';
import { AlertesController } from './alertes.controller';
import { AlertesService } from './alertes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Alerte])],
  controllers: [AlertesController],
  providers: [AlertesService],
  exports: [AlertesService],
})
export class AlertesModule {}
