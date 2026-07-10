import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertesModule } from './modules/alertes/alertes.module';
import { AnalyseMulticritereModule } from './modules/analyse-multicritere/analyse-multicritere.module';
import { AuthModule } from './modules/auth/auth.module';
import { CollecteModule } from './modules/collecte/collecte.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SigModule } from './modules/sig/sig.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url:
        process.env.DATABASE_URL ??
        'postgresql://geodecisionnel:geodecisionnel@localhost:5432/geodecisionnel',
      autoLoadEntities: true,
      synchronize: true,
    }),
    AuthModule,
    UsersModule,
    CollecteModule,
    SigModule,
    DashboardModule,
    AlertesModule,
    AnalyseMulticritereModule,
  ],
})
export class AppModule {}
