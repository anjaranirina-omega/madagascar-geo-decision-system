import { Module } from '@nestjs/common';
import { CollecteController } from './collecte.controller';
import { CollecteService } from './collecte.service';

@Module({ controllers: [CollecteController], providers: [CollecteService], exports: [CollecteService] })
export class CollecteModule {}
