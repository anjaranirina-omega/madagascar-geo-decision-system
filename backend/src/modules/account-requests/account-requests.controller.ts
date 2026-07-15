import { Body, Controller, Get, Post } from '@nestjs/common';
import { AccountRequestsService } from './account-requests.service';
import { CreateAccountRequestDto } from './dto/create-account-request.dto';

@Controller('account-requests')
export class AccountRequestsController {
  constructor(
    private readonly accountRequestsService: AccountRequestsService,
  ) {}

  @Post()
  create(@Body() dto: CreateAccountRequestDto) {
    return this.accountRequestsService.create(dto);
  }

  @Get()
  findAll() {
    return this.accountRequestsService.findAll();
  }
}
