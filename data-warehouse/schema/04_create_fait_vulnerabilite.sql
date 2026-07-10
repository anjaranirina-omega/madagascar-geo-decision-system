CREATE TABLE IF NOT EXISTS dwh.fait_vulnerabilite (
  id_fait BIGSERIAL PRIMARY KEY,
  id_temps INT REFERENCES dwh.dim_temps(id_temps),
  id_localisation INT REFERENCES dwh.dim_localisation(id_localisation),
  id_risque INT REFERENCES dwh.dim_risque(id_risque),
  indice_risque NUMERIC(5,2) NOT NULL,
  indice_vulnerabilite NUMERIC(5,2) NOT NULL,
  niveau_alerte VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
