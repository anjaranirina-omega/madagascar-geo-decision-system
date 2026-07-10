import { Module } from '@nestjs/common';
import { SigController } from './sig.controller';
import { SigService } from './sig.service';

@Module({ controllers: [SigController], providers: [SigService], exports: [SigService] })
export class SigModule {}
