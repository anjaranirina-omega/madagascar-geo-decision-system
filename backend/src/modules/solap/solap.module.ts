import { Module } from '@nestjs/common';
import { SolapController } from './solap.controller';
import { SolapService } from './solap.service';

@Module({
  controllers: [SolapController],
  providers: [SolapService],
  exports: [SolapService],
})
export class SolapModule {}
