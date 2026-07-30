import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountRequestsModule } from './modules/account-requests/account-requests.module';
import { AlertesModule } from './modules/alertes/alertes.module';
import { AnalyseMulticritereModule } from './modules/analyse-multicritere/analyse-multicritere.module';
import { AuthModule } from './modules/auth/auth.module';
import { CollecteModule } from './modules/collecte/collecte.module';
import { ClimateModule } from './modules/climate/climate.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DataSourcesModule } from './modules/data-sources/data-sources.module';
import { GeographieModule } from './modules/geographie/geographie.module';
import { RastersModule } from './modules/rasters/rasters.module';
import { SigModule } from './modules/sig/sig.module';
import { UsersModule } from './modules/users/users.module';
import { EtlModule } from './modules/etl/etl.module';
import { MeteoModule } from './modules/meteo/meteo.module';
import { ZoneIndicatorsModule } from './modules/zone-indicators/zone-indicators.module';
import { RisquesModule } from './modules/risques/risques.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url:
        process.env.DATABASE_URL ??
        'postgresql://geodecisionnel:geodecisionnel@localhost:5433/geodecisionnel',
      autoLoadEntities: true,
      synchronize: true,
    }),
    AuthModule,
    UsersModule,
    EtlModule,
    MeteoModule,
    ZoneIndicatorsModule,
    GeographieModule,
    AccountRequestsModule,
    RastersModule,
    RisquesModule,
    CollecteModule,
    ClimateModule,
    SigModule,
    DashboardModule,
    DataSourcesModule,
    AlertesModule,
    AnalyseMulticritereModule,
  ],
})
export class AppModule {}
