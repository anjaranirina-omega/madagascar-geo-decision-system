import { Injectable } from '@nestjs/common';

@Injectable()
export class SigService {
  health() { return { module: 'sig', status: 'ok' }; }
}
