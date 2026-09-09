CREATE TABLE IF NOT EXISTS dwh.fact_raster_processing (
    fact_raster_processing_key bigserial PRIMARY KEY,
    time_key integer REFERENCES dwh.dim_time(time_key),
    raster_type varchar(100),
    raster_name varchar(180),
    file_path text,
    min_value double precision,
    max_value double precision,
    mean_value double precision,
    width integer,
    height integer,
    crs varchar(100),
    created_at timestamp,
    updated_at timestamp
);

CREATE INDEX IF NOT EXISTS idx_fact_raster_processing_time
ON dwh.fact_raster_processing(time_key, raster_type);
