CREATE INDEX IF NOT EXISTS idx_dim_localisation_geom ON dwh.dim_localisation USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_fait_vulnerabilite_temps ON dwh.fait_vulnerabilite(id_temps);
CREATE INDEX IF NOT EXISTS idx_fait_vulnerabilite_localisation ON dwh.fait_vulnerabilite(id_localisation);
CREATE INDEX IF NOT EXISTS idx_fait_vulnerabilite_risque ON dwh.fait_vulnerabilite(id_risque);
