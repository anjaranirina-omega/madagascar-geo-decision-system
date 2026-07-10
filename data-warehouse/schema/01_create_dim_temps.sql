CREATE TABLE IF NOT EXISTS dwh.dim_temps (
  id_temps SERIAL PRIMARY KEY,
  date_jour DATE UNIQUE NOT NULL,
  jour INT NOT NULL,
  mois INT NOT NULL,
  trimestre INT NOT NULL,
  annee INT NOT NULL
);
