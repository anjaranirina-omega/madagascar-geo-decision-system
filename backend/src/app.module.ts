import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { CollecteModule } from './modules/collecte/collecte.module';
import { SigModule } from './modules/sig/sig.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AlertesModule } from './modules/alertes/alertes.module';
import { AnalyseMulticritereModule } from './modules/analyse-multicritere/analyse-multicritere.module';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), ScheduleModule.forRoot(), AuthModule, CollecteModule, SigModule, DashboardModule, AlertesModule, AnalyseMulticritereModule] })
export class AppModule {}
