-- Vue analytique régionale consolidée pour le SOLAP et le reporting
CREATE OR REPLACE VIEW dwh.vue_indicateurs_regionaux AS
SELECT
    z.zone_id,
    z.zone_code,
    z.zone_nom AS region_nom,
    rt.risk_type,
    rt.label AS type_risque,
    t.year AS annee,
    t.month AS mois,
    t.quarter AS trimestre,
    AVG(f.risk_mean) AS risque_moyen,
    MAX(f.risk_max) AS risque_maximal,
    AVG(f.hazard_mean) AS alea_moyen,
    SUM(f.population_exposed) AS population_totale_exposee,
    AVG(z.area_km2) AS superficie_km2,
    COUNT(*) FILTER (WHERE f.risk_level = 'CRITIQUE') AS nb_communes_critiques,
    COUNT(*) FILTER (WHERE f.risk_level = 'ELEVE') AS nb_communes_elevees,
    COUNT(*) AS total_communes_evaluees
FROM dwh.fact_risk_indicator f
JOIN dwh.dim_zone z ON z.zone_key = f.zone_key
JOIN dwh.dim_risk_type rt ON rt.risk_type_key = f.risk_type_key
JOIN dwh.dim_time t ON t.time_key = f.time_key
WHERE z.zone_type = 'region'
GROUP BY
    z.zone_id,
    z.zone_code,
    z.zone_nom,
    rt.risk_type,
    rt.label,
    t.year,
    t.month,
    t.quarter;
