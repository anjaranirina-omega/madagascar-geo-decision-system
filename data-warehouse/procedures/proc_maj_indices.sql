-- Procédure stockée d'actualisation des indicateurs et agrégations du Data Warehouse
CREATE OR REPLACE PROCEDURE dwh.proc_maj_indices()
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Rafraîchissement des vues matérialisées du DWH
  IF EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE schemaname = 'dwh' AND matviewname = 'mv_regional_risk_summary'
  ) THEN
    REFRESH MATERIALIZED VIEW dwh.mv_regional_risk_summary;
    RAISE NOTICE 'Vue matérialisée dwh.mv_regional_risk_summary actualisée avec succès.';
  END IF;

  -- 2. Analyse des statistiques pour le planificateur de requêtes
  ANALYZE dwh.fact_risk_indicator;
  ANALYZE dwh.dim_zone;
  ANALYZE dwh.dim_time;

  RAISE NOTICE 'Actualisation des statistiques DWH terminée.';
END;
$$;
