import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyseMulticritereService {
  health() { return { module: 'analyse-multicritere', status: 'ok' }; }
}
