import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';
import { InterventionsService } from './interventions.service';

@Controller('interventions')
export class InterventionsController {
  constructor(private readonly interventionsService: InterventionsService) {}

  @Post()
  create(@Body() dto: CreateInterventionDto) {
    return this.interventionsService.create(dto);
  }

  @Get()
  findAll() {
    return this.interventionsService.findAll();
  }

  @Get('commune/:communeId')
  findByCommune(@Param('communeId') communeId: string) {
    return this.interventionsService.findByCommune(communeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.interventionsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInterventionDto) {
    return this.interventionsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.interventionsService.remove(id);
  }
}
