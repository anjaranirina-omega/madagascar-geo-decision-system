import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type SolapRiskCubeQuery = {
  riskType?: string;
  zoneType?: string;
  year?: number;
  month?: number;
  limit?: number;
};

export type SolapDrilldownQuery = {
  riskType?: string;
  fromLevel?: string;
  zoneId?: string;
  year?: number;
  month?: number;
};

export type SolapTimeSeriesQuery = {
  riskType?: string;
  zoneType?: string;
  zoneId?: string;
};

@Injectable()
export class SolapService {
  constructor(private readonly dataSource: DataSource) {}

  async getRiskCube(query: SolapRiskCubeQuery) {
    const params: unknown[] = [];
    const filters: string[] = [];

    if (query.riskType) {
      params.push(query.riskType);
      filters.push(`rt.risk_type = $${params.length}`);
    }

    if (query.zoneType) {
      params.push(query.zoneType);
      filters.push(`z.zone_type = $${params.length}`);
    }

    if (query.year) {
      params.push(query.year);
      filters.push(`t.year = $${params.length}`);
    }

    if (query.month) {
      params.push(query.month);
      filters.push(`t.month = $${params.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 500);

    const sql = `
      SELECT
        rt.risk_type AS "riskType",
        rt.label AS "riskLabel",
        z.zone_type AS "zoneType",
        z.zone_id AS "zoneId",
        z.zone_code AS "zoneCode",
        z.zone_nom AS "zoneNom",
        t.year AS "year",
        t.month AS "month",
        AVG(f.risk_mean) AS "riskMean",
        MAX(f.risk_max) AS "riskMax",
        AVG(f.hazard_mean) AS "hazardMean",
        SUM(f.population_exposed) AS "populationExposed",
        AVG(f.area_km2) AS "areaKm2",
        COUNT(*) AS "recordsCount"
      FROM dwh.fact_risk_indicator f
      JOIN dwh.dim_risk_type rt
        ON rt.risk_type_key = f.risk_type_key
      JOIN dwh.dim_zone z
        ON z.zone_key = f.zone_key
      JOIN dwh.dim_time t
        ON t.time_key = f.time_key
      ${whereClause}
      GROUP BY
        rt.risk_type,
        rt.label,
        z.zone_type,
        z.zone_id,
        z.zone_code,
        z.zone_nom,
        t.year,
        t.month
      ORDER BY
        "riskMax" DESC NULLS LAST
      LIMIT ${limit};
    `;

    return this.dataSource.query(sql, params);
  }

  async getRiskSummary(query: SolapRiskCubeQuery) {
    const params: unknown[] = [];
    const filters: string[] = [];

    if (query.riskType) {
      params.push(query.riskType);
      filters.push(`rt.risk_type = $${params.length}`);
    }

    if (query.zoneType) {
      params.push(query.zoneType);
      filters.push(`z.zone_type = $${params.length}`);
    }

    if (query.year) {
      params.push(query.year);
      filters.push(`t.year = $${params.length}`);
    }

    if (query.month) {
      params.push(query.month);
      filters.push(`t.month = $${params.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const sql = `
      SELECT
        rt.risk_type AS "riskType",
        rt.label AS "riskLabel",
        z.zone_type AS "zoneType",
        AVG(f.risk_mean) AS "riskMean",
        MAX(f.risk_max) AS "riskMax",
        AVG(f.hazard_mean) AS "hazardMean",
        SUM(f.population_exposed) AS "populationExposed",
        COUNT(DISTINCT z.zone_id) AS "zoneCount",
        COUNT(*) AS "recordsCount"
      FROM dwh.fact_risk_indicator f
      JOIN dwh.dim_risk_type rt
        ON rt.risk_type_key = f.risk_type_key
      JOIN dwh.dim_zone z
        ON z.zone_key = f.zone_key
      JOIN dwh.dim_time t
        ON t.time_key = f.time_key
      ${whereClause}
      GROUP BY
        rt.risk_type,
        rt.label,
        z.zone_type
      ORDER BY
        rt.risk_type,
        z.zone_type;
    `;

    return this.dataSource.query(sql, params);
  }

  async getRiskDrilldown(query: SolapDrilldownQuery) {
    const riskType = query.riskType ?? 'GLOBAL';
    const fromLevel = query.fromLevel ?? 'region';

    let targetLevel = 'district';

    if (fromLevel === 'district') {
      targetLevel = 'commune';
    }

    if (fromLevel === 'commune') {
      targetLevel = 'commune';
    }

    const params: unknown[] = [riskType, targetLevel];
    const filters: string[] = [`rt.risk_type = $1`, `z.zone_type = $2`];

    if (query.year) {
      params.push(query.year);
      filters.push(`t.year = $${params.length}`);
    }

    if (query.month) {
      params.push(query.month);
      filters.push(`t.month = $${params.length}`);
    }

    /*
     * Drill-down spatial :
     * - region -> districts contenus dans la région
     * - district -> communes contenues dans le district
     *
     * On utilise ST_Contains / ST_Intersects sur dim_zone.
     */
    let spatialJoin = '';

    if (query.zoneId && fromLevel !== 'commune') {
      params.push(query.zoneId);
      const parentParam = `$${params.length}`;

      spatialJoin = `
        JOIN dwh.dim_zone parent
          ON parent.zone_id = ${parentParam}::uuid
         AND parent.zone_type = '${fromLevel}'
         AND ST_Intersects(parent.geom, z.geom)
      `;
    }

    const whereClause = `WHERE ${filters.join(' AND ')}`;

    const sql = `
      SELECT
        rt.risk_type AS "riskType",
        rt.label AS "riskLabel",
        z.zone_type AS "zoneType",
        z.zone_id AS "zoneId",
        z.zone_code AS "zoneCode",
        z.zone_nom AS "zoneNom",
        AVG(f.risk_mean) AS "riskMean",
        MAX(f.risk_max) AS "riskMax",
        AVG(f.hazard_mean) AS "hazardMean",
        SUM(f.population_exposed) AS "populationExposed",
        AVG(f.area_km2) AS "areaKm2",
        COUNT(*) AS "recordsCount"
      FROM dwh.fact_risk_indicator f
      JOIN dwh.dim_risk_type rt
        ON rt.risk_type_key = f.risk_type_key
      JOIN dwh.dim_zone z
        ON z.zone_key = f.zone_key
      JOIN dwh.dim_time t
        ON t.time_key = f.time_key
      ${spatialJoin}
      ${whereClause}
      GROUP BY
        rt.risk_type,
        rt.label,
        z.zone_type,
        z.zone_id,
        z.zone_code,
        z.zone_nom
      ORDER BY
        "riskMax" DESC NULLS LAST;
    `;

    return this.dataSource.query(sql, params);
  }

  async getRiskTimeSeries(query: SolapTimeSeriesQuery) {
    const params: unknown[] = [];
    const filters: string[] = [];

    if (query.riskType) {
      params.push(query.riskType);
      filters.push(`rt.risk_type = $${params.length}`);
    }

    if (query.zoneType) {
      params.push(query.zoneType);
      filters.push(`z.zone_type = $${params.length}`);
    }

    if (query.zoneId) {
      params.push(query.zoneId);
      filters.push(`z.zone_id = $${params.length}::uuid`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const sql = `
      SELECT
        rt.risk_type AS "riskType",
        rt.label AS "riskLabel",
        t.full_date AS "date",
        t.year AS "year",
        t.month AS "month",
        AVG(f.risk_mean) AS "riskMean",
        MAX(f.risk_max) AS "riskMax",
        AVG(f.hazard_mean) AS "hazardMean",
        SUM(f.population_exposed) AS "populationExposed",
        COUNT(*) AS "recordsCount"
      FROM dwh.fact_risk_indicator f
      JOIN dwh.dim_risk_type rt
        ON rt.risk_type_key = f.risk_type_key
      JOIN dwh.dim_zone z
        ON z.zone_key = f.zone_key
      JOIN dwh.dim_time t
        ON t.time_key = f.time_key
      ${whereClause}
      GROUP BY
        rt.risk_type,
        rt.label,
        t.full_date,
        t.year,
        t.month
      ORDER BY
        t.full_date ASC;
    `;

    return this.dataSource.query(sql, params);
  }
}
