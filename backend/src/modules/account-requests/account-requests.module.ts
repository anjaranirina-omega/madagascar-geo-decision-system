import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AccountRequestsController } from './account-requests.controller';
import { AccountRequestsService } from './account-requests.service';
import { AccountRequest } from './entities/account-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AccountRequest]), UsersModule],
  controllers: [AccountRequestsController],
  providers: [AccountRequestsService],
  exports: [AccountRequestsService],
})
export class AccountRequestsModule {}
