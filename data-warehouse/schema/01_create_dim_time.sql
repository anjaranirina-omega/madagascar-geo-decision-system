CREATE EXTENSION IF NOT EXISTS postgis;
CREATE SCHEMA IF NOT EXISTS dwh;

CREATE TABLE IF NOT EXISTS dwh.dim_time (
    time_key integer PRIMARY KEY,
    full_date date NOT NULL UNIQUE,
    year integer NOT NULL,
    quarter integer NOT NULL,
    month integer NOT NULL,
    month_name varchar(20) NOT NULL,
    day integer NOT NULL,
    week integer NOT NULL,
    day_of_week integer NOT NULL,
    day_name varchar(20) NOT NULL,
    is_weekend boolean NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dim_time_year_month
ON dwh.dim_time (year, month);
