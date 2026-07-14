import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Commune } from '../geographie/entities/commune.entity';
import { User } from '../users/entities/user.entity';
import { Intervention } from './entities/intervention.entity';
import { InterventionsController } from './interventions.controller';
import { InterventionsService } from './interventions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Intervention, Commune, User])],
  controllers: [InterventionsController],
  providers: [InterventionsService],
  exports: [InterventionsService, TypeOrmModule],
})
export class InterventionsModule {}
