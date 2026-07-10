CREATE TABLE IF NOT EXISTS dwh.dim_risque (
  id_risque SERIAL PRIMARY KEY,
  code_risque VARCHAR(50) UNIQUE NOT NULL,
  libelle VARCHAR(150) NOT NULL,
  description TEXT
);
INSERT INTO dwh.dim_risque(code_risque, libelle) VALUES
('CYCLONE','Cyclone'), ('INONDATION','Inondation'), ('SECHERESSE','Sécheresse'), ('GLISSEMENT_TERRAIN','Glissement de terrain')
ON CONFLICT DO NOTHING;
