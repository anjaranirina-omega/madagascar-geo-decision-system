-- Vue matérialisée d'agrégation régionale (Roll-Up spatial) pour le tableau de bord et le SOLAP
CREATE MATERIALIZED VIEW IF NOT EXISTS dwh.mv_regional_risk_summary AS
SELECT
    rt.risk_type,
    rt.label AS risk_label,
    z.zone_id,
    z.zone_code,
    z.zone_nom AS region_nom,
    t.year,
    t.month,
    AVG(f.risk_mean) AS risk_mean,
    MAX(f.risk_max) AS risk_max,
    AVG(f.hazard_mean) AS hazard_mean,
    SUM(f.population_exposed) AS population_exposed,
    AVG(z.area_km2) AS area_km2,
    COUNT(*) AS communes_count
FROM dwh.fact_risk_indicator f
JOIN dwh.dim_risk_type rt ON rt.risk_type_key = f.risk_type_key
JOIN dwh.dim_zone z ON z.zone_key = f.zone_key
JOIN dwh.dim_time t ON t.time_key = f.time_key
WHERE z.zone_type = 'region'
GROUP BY rt.risk_type, rt.label, z.zone_id, z.zone_code, z.zone_nom, t.year, t.month
ORDER BY risk_max DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_regional_risk_summary_pk
ON dwh.mv_regional_risk_summary (risk_type, zone_id, year, month);
