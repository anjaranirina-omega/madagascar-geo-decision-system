import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DataSourcesService } from './data-sources.service';
import { DataSourceCode } from './entities/data-source-status.entity';

@Controller('data-sources')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DataSourcesController {
  constructor(private readonly dataSourcesService: DataSourcesService) {}

  @Get()
  @Roles('ADMIN', 'ANALYSTE', 'OBSERVATEUR')
  findAll() {
    return this.dataSourcesService.findAll();
  }

  @Get(':code')
  @Roles('ADMIN', 'ANALYSTE', 'OBSERVATEUR')
  findOne(@Param('code') code: DataSourceCode) {
    return this.dataSourcesService.findOne(code);
  }

  @Post('seed')
  @Roles('ADMIN')
  seedDefaults() {
    return this.dataSourcesService.seedDefaults();
  }
}
