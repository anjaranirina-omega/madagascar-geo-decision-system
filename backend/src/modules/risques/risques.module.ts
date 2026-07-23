import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CriteriaWeight } from './entities/criteria-weight.entity';
import { RisquesController } from './risques.controller';
import { RisquesService } from './risques.service';

@Module({
  imports: [TypeOrmModule.forFeature([CriteriaWeight])],
  controllers: [RisquesController],
  providers: [RisquesService],
  exports: [RisquesService],
})
export class RisquesModule {}
