import { Injectable } from '@nestjs/common';

@Injectable()
export class CollecteService {
  health() { return { module: 'collecte', status: 'ok' }; }
}
