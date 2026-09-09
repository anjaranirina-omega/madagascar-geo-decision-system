CREATE TABLE IF NOT EXISTS dwh.dim_data_source (
    data_source_key bigserial PRIMARY KEY,
    code varchar(80) NOT NULL UNIQUE,
    name varchar(160) NOT NULL,
    category varchar(80),
    provider varchar(160),
    status varchar(50),
    last_success_at timestamp,
    last_sync_at timestamp
);

CREATE INDEX IF NOT EXISTS idx_dim_data_source_code ON dwh.dim_data_source(code);
