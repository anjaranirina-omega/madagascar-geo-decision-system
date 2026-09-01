import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MeteoModule } from '../meteo/meteo.module';
import { UsersModule } from '../users/users.module';
import { Alerte } from './entities/alerte.entity';
import { AlertesController } from './alertes.controller';
import { AlertesScheduler } from './alertes.scheduler';
import { AlertesService } from './alertes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alerte]),
    MeteoModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AlertesController],
  providers: [AlertesService, AlertesScheduler],
  exports: [AlertesService],
})
export class AlertesModule {}
