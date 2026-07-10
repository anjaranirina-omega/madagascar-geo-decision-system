import { Injectable } from '@nestjs/common';

@Injectable()
export class DashboardService {
  health() { return { module: 'dashboard', status: 'ok' }; }
}
