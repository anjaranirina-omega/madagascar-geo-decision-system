export type RiskLevel = 'FAIBLE' | 'MOYEN' | 'ELEVE' | 'CRITIQUE';
export interface RiskIndicator { locationCode: string; riskIndex: number; vulnerabilityIndex: number; level: RiskLevel; }
