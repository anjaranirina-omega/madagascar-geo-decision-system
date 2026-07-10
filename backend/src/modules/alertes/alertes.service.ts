import { Injectable } from '@nestjs/common';

@Injectable()
export class AlertesService {
  health() { return { module: 'alertes', status: 'ok' }; }
}
