CREATE TABLE IF NOT EXISTS dwh.dim_zone (
    zone_key bigserial PRIMARY KEY,
    zone_type varchar(30) NOT NULL,
    zone_id uuid NOT NULL,
    zone_code varchar(100),
    zone_nom varchar(180),
    area_km2 double precision,
    geom geometry(MultiPolygon, 4326),
    UNIQUE(zone_type, zone_id)
);

CREATE INDEX IF NOT EXISTS idx_dim_zone_type ON dwh.dim_zone(zone_type);
CREATE INDEX IF NOT EXISTS idx_dim_zone_lookup ON dwh.dim_zone(zone_type, zone_code);
CREATE INDEX IF NOT EXISTS idx_dim_zone_geom ON dwh.dim_zone USING GIST(geom);
