CREATE TABLE IF NOT EXISTS dwh.dim_localisation (
  id_localisation SERIAL PRIMARY KEY,
  code_region VARCHAR(20),
  region VARCHAR(150),
  code_district VARCHAR(20),
  district VARCHAR(150),
  code_commune VARCHAR(20),
  commune VARCHAR(150),
  geom geometry(MultiPolygon, 4326)
);
