CREATE TABLE IF NOT EXISTS dwh.dim_risk_type (
    risk_type_key bigserial PRIMARY KEY,
    risk_type varchar(50) NOT NULL UNIQUE,
    label varchar(160) NOT NULL,
    description text
);

INSERT INTO dwh.dim_risk_type (risk_type, label, description) VALUES
('GLOBAL', 'Risque climatique global', 'Indice composite multi-aléas global'),
('FLOOD', 'Risque inondation', 'Modèle spécifique inondation et submersion'),
('DROUGHT', 'Risque sécheresse', 'Modèle spécifique sécheresse et stress hydrique'),
('LANDSLIDE', 'Risque glissement de terrain', 'Modèle spécifique glissement de terrain et instabilité des pentes'),
('CYCLONE', 'Risque cyclonique', 'Modèle cyclonique historique IBTrACS et vents')
ON CONFLICT (risk_type) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description;
