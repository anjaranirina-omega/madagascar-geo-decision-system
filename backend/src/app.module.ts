import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountRequestsModule } from './modules/account-requests/account-requests.module';
import { AlertesModule } from './modules/alertes/alertes.module';
import { AnalyseMulticritereModule } from './modules/analyse-multicritere/analyse-multicritere.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClimateModule } from './modules/climate/climate.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DataSourcesModule } from './modules/data-sources/data-sources.module';
import { GeographieModule } from './modules/geographie/geographie.module';
import { RastersModule } from './modules/rasters/rasters.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SolapModule } from './modules/solap/solap.module';
import { StorageModule } from './modules/storage/storage.module';
import { UsersModule } from './modules/users/users.module';
import { EtlModule } from './modules/etl/etl.module';
import { MeteoModule } from './modules/meteo/meteo.module';
import { OperationalSignalsModule } from './modules/operational-signals/operational-signals.module';
import { ZoneIndicatorsModule } from './modules/zone-indicators/zone-indicators.module';
import { RisquesModule } from './modules/risques/risques.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url:
        process.env.DATABASE_URL ??
        'postgresql://geodecisionnel:geodecisionnel@localhost:5433/geodecisionnel',
      autoLoadEntities: true,
      synchronize:
        process.env.TYPEORM_SYNCHRONIZE !== undefined
          ? process.env.TYPEORM_SYNCHRONIZE === 'true'
          : process.env.NODE_ENV !== 'production',
    }),
    StorageModule,
    AuthModule,
    UsersModule,
    EtlModule,
    MeteoModule,
    OperationalSignalsModule,
    ZoneIndicatorsModule,
    GeographieModule,
    AccountRequestsModule,
    RastersModule,
    ReportsModule,
    RisquesModule,
    ClimateModule,
    SettingsModule,
    SolapModule,
    DashboardModule,
    DataSourcesModule,
    AlertesModule,
    AnalyseMulticritereModule,
  ],
})
export class AppModule {}
