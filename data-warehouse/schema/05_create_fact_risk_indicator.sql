CREATE TABLE IF NOT EXISTS dwh.fact_risk_indicator (
    fact_risk_indicator_key bigserial PRIMARY KEY,
    time_key integer REFERENCES dwh.dim_time(time_key),
    zone_key bigint REFERENCES dwh.dim_zone(zone_key),
    risk_type_key bigint REFERENCES dwh.dim_risk_type(risk_type_key),
    risk_mean double precision,
    risk_max double precision,
    hazard_mean double precision,
    population_exposed double precision,
    area_km2 double precision,
    risk_level varchar(50),
    source_table varchar(80),
    operational_updated_at timestamp,
    raster_layer_id uuid,
    UNIQUE(time_key, zone_key, risk_type_key)
);

CREATE INDEX IF NOT EXISTS idx_fact_risk_indicator_dims
ON dwh.fact_risk_indicator(time_key, zone_key, risk_type_key);

CREATE INDEX IF NOT EXISTS idx_fact_risk_indicator_solap_query
ON dwh.fact_risk_indicator(risk_type_key, time_key, risk_max DESC);

CREATE INDEX IF NOT EXISTS idx_fact_risk_indicator_zone
ON dwh.fact_risk_indicator(zone_key, time_key);
