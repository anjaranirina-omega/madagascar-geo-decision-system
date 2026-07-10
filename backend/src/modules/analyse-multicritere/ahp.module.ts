import { Module } from '@nestjs/common';
import { AnalyseMulticritereController } from './ahp.controller';
import { AnalyseMulticritereService } from './ahp.service';

@Module({ controllers: [AnalyseMulticritereController], providers: [AnalyseMulticritereService], exports: [AnalyseMulticritereService] })
export class AnalyseMulticritereModule {}
