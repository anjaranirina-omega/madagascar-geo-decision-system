CREATE TABLE IF NOT EXISTS dwh.fact_climate_observation (
    fact_climate_observation_key bigserial PRIMARY KEY,
    time_key integer REFERENCES dwh.dim_time(time_key),
    zone_key bigint REFERENCES dwh.dim_zone(zone_key),
    data_source_key bigint REFERENCES dwh.dim_data_source(data_source_key),
    temperature_mean double precision,
    humidity_mean double precision,
    wind_speed_mean double precision,
    precipitation double precision,
    observed_date date,
    operational_updated_at timestamp
);

CREATE INDEX IF NOT EXISTS idx_fact_climate_observation_dims
ON dwh.fact_climate_observation(time_key, zone_key, data_source_key);
