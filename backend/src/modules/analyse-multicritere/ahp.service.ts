import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AhpCalculateDto } from './dto/ahp-calculate.dto';

// Table de Random Index (RI) de Saaty pour n = 1..10
const SAATY_RI: Record<number, number> = {
  1: 0.0,
  2: 0.0,
  3: 0.58,
  4: 0.9,
  5: 1.12,
  6: 1.24,
  7: 1.32,
  8: 1.41,
  9: 1.45,
  10: 1.49,
};

export interface AhpCalculationResult {
  weights: Record<string, number>;
  consistencyRatio: number;
  isConsistent: boolean;
  lambdaMax: number;
  consistencyIndex: number;
  riskIndex: number;
  alertLevel: 'FAIBLE' | 'MOYEN' | 'ELEVE' | 'CRITIQUE';
  engine: 'fastapi' | 'internal';
}

@Injectable()
export class AnalyseMulticritereService {
  private readonly logger = new Logger(AnalyseMulticritereService.name);

  private getAhpEngineUrl(): string {
    return process.env.AHP_ENGINE_URL ?? 'http://localhost:8000';
  }

  /**
   * Health check du module et du microservice Python AHP Engine.
   */
  async health() {
    const engineUrl = this.getAhpEngineUrl();
    let engineStatus = 'unreachable';
    let engineDetails: any = null;

    try {
      const response = await fetch(`${engineUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        engineStatus = 'connected';
        engineDetails = await response.json();
      }
    } catch {
      engineStatus = 'offline (fallback disponible)';
    }

    return {
      module: 'analyse-multicritere',
      status: 'ok',
      engineUrl,
      engineStatus,
      engineDetails,
    };
  }

  /**
   * Retourne les critères disponibles par catégorie pour l'AHP.
   */
  getCriteria() {
    return {
      climatic: [
        { code: 'precipitations', label: 'Précipitations (CHIRPS)', description: 'Cumul pluviométrique et intensité des pluies' },
        { code: 'temperature', label: 'Température (NASA POWER)', description: 'Température moyenne et anomalies thermiques' },
        { code: 'humidite', label: 'Humidité relative', description: 'Taux d’humidité atmosphérique' },
        { code: 'vent', label: 'Vitesse du vent', description: 'Rafales et exposition éolienne/cyclonique' },
      ],
      geographic: [
        { code: 'altitude', label: 'Altitude (DEM)', description: 'Élévation topographique au-dessus du niveau de la mer' },
        { code: 'pente', label: 'Pente topographique', description: 'Inclinaison du terrain en degrés' },
        { code: 'proximite_cours_eau', label: 'Proximité hydrographique', description: 'Distance aux rivières et cours d’eau majeurs' },
        { code: 'occupation_sol', label: 'Occupation du sol (WorldCover)', description: 'Types de couverture (forêt, urbain, agricole, eau)' },
      ],
      socio_economic: [
        { code: 'densite_population', label: 'Densité de population (WorldPop)', description: 'Nombre d’habitants par km²' },
        { code: 'infrastructures_critiques', label: 'Infrastructures critiques', description: 'Routes, ponts, réseaux électriques' },
        { code: 'ecoles', label: 'Établissements scolaires', description: 'Présence d’écoles et centres de formation' },
        { code: 'centres_sante', label: 'Centres de santé & CSB', description: 'Accessibilité aux soins d’urgence' },
      ],
    };
  }

  /**
   * Calcul AHP de Saaty : délègue à l'API FastAPI ahp-engine avec bascule de secours automatique.
   */
  async calculate(dto: AhpCalculateDto): Promise<AhpCalculationResult> {
    const { criteria, matrix, normalizedValues = {} } = dto;
    const n = criteria.length;

    // Validation de la matrice carrée
    if (!Array.isArray(matrix) || matrix.length !== n) {
      throw new BadRequestException(
        `La matrice doit avoir exactement ${n} lignes pour ${n} critères.`,
      );
    }

    for (let i = 0; i < n; i++) {
      if (!Array.isArray(matrix[i]) || matrix[i].length !== n) {
        throw new BadRequestException(
          `La ligne ${i + 1} de la matrice doit comporter ${n} colonnes.`,
        );
      }
      if (matrix[i][i] !== 1) {
        matrix[i][i] = 1;
      }
    }

    // 1. Tenter d'appeler le microservice FastAPI
    const engineUrl = this.getAhpEngineUrl();
    try {
      const response = await fetch(`${engineUrl}/ahp/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          criteria,
          matrix,
          normalized_values: normalizedValues,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          weights: Record<string, number>;
          consistency_ratio: number;
          risk_index: number;
          alert_level: 'FAIBLE' | 'MOYEN' | 'ELEVE' | 'CRITIQUE';
        };

        if (data && data.weights) {
          const cr = data.consistency_ratio;
          const ri = SAATY_RI[n] || 1.49;
          const ci = cr * ri;
          const lambdaMax = ci * (n - 1) + n;

          return {
            weights: data.weights,
            consistencyRatio: cr,
            isConsistent: cr < 0.1,
            lambdaMax: Number(lambdaMax.toFixed(4)),
            consistencyIndex: Number(ci.toFixed(4)),
            riskIndex: data.risk_index,
            alertLevel: data.alert_level,
            engine: 'fastapi',
          };
        }
      }
    } catch (engineError: any) {
      this.logger.warn(
        `[AnalyseMulticritere] ahp-engine injoignable (${engineError?.message}), exécution du calcul interne Saaty.`,
      );
    }

    // 2. Moteur de secours interne en TypeScript
    return this.calculateInternalSaaty(criteria, matrix, normalizedValues);
  }

  /**
   * Calcul Saaty matriciel interne direct (Algorithme de l'Approximation du Vecteur Propre).
   */
  private calculateInternalSaaty(
    criteria: string[],
    matrix: number[][],
    normalizedValues: Record<string, number>,
  ): AhpCalculationResult {
    const n = criteria.length;

    // 1. Somme des colonnes
    const colSums: number[] = new Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        colSums[j] += matrix[i][j];
      }
    }

    // 2. Normalisation des colonnes et moyenne par ligne (Vecteur de priorité / Poids)
    const weightsArray: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let rowSumNormalized = 0;
      for (let j = 0; j < n; j++) {
        rowSumNormalized += colSums[j] > 0 ? matrix[i][j] / colSums[j] : 1 / n;
      }
      weightsArray[i] = rowSumNormalized / n;
    }

    // 3. Produit matriciel A * W
    const aw: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        aw[i] += matrix[i][j] * weightsArray[j];
      }
    }

    // 4. Calcul de Lambda Max
    let lambdaSum = 0;
    for (let i = 0; i < n; i++) {
      lambdaSum += weightsArray[i] > 0 ? aw[i] / weightsArray[i] : n;
    }
    const lambdaMax = lambdaSum / n;

    // 5. Indice de Cohérence (CI) et Ratio de Cohérence (CR)
    const ci = n > 1 ? (lambdaMax - n) / (n - 1) : 0;
    const ri = SAATY_RI[n] ?? 1.49;
    const cr = ri > 0 ? ci / ri : 0;

    // 6. Dictionnaire des poids
    const weights: Record<string, number> = {};
    criteria.forEach((name, idx) => {
      weights[name] = Number(weightsArray[idx].toFixed(4));
    });

    // 7. Calcul du score de risque pondéré
    let riskScore = 0;
    if (Object.keys(normalizedValues).length > 0) {
      for (let i = 0; i < n; i++) {
        const cName = criteria[i];
        const normVal = Number(normalizedValues[cName] ?? 0);
        riskScore += weightsArray[i] * normVal * 100;
      }
    } else {
      riskScore = 50.0;
    }

    const alertLevel =
      riskScore <= 30
        ? 'FAIBLE'
        : riskScore <= 60
          ? 'MOYEN'
          : riskScore <= 80
            ? 'ELEVE'
            : 'CRITIQUE';

    return {
      weights,
      consistencyRatio: Number(cr.toFixed(4)),
      isConsistent: cr < 0.1,
      lambdaMax: Number(lambdaMax.toFixed(4)),
      consistencyIndex: Number(ci.toFixed(4)),
      riskIndex: Number(riskScore.toFixed(2)),
      alertLevel,
      engine: 'internal',
    };
  }
}
