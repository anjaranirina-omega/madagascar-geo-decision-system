import os
import uuid
from pathlib import Path

import geopandas as gpd
import psycopg
from dotenv import load_dotenv
from shapely import wkb
from shapely.geometry import MultiPolygon, Polygon


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_GADM_PATH = PROJECT_ROOT / "etl" / "data" / "geographie" / "gadm41_MDG.gpkg"

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / "backend" / ".env")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://geodecisionnel:geodecisionnel@localhost:5433/geodecisionnel",
)


# Mapping GADM Madagascar 4.1
# ADM_ADM_1 = anciennes provinces
# ADM_ADM_2 = régions
# ADM_ADM_3 = districts
# ADM_ADM_4 = communes
REGIONS_LAYER = "ADM_ADM_2"
DISTRICTS_LAYER = "ADM_ADM_3"
COMMUNES_LAYER = "ADM_ADM_4"


def normalize_geometry(geom):
    if geom is None or geom.is_empty:
        return None

    if not geom.is_valid:
        geom = geom.buffer(0)

    if isinstance(geom, Polygon):
        geom = MultiPolygon([geom])

    if geom is None or geom.is_empty:
        return None

    return geom


def read_layer(gpkg_path: Path, layer: str) -> gpd.GeoDataFrame:
    print(f"Lecture couche {layer}...")
    gdf = gpd.read_file(gpkg_path, layer=layer)

    if gdf.crs is None:
        gdf = gdf.set_crs(epsg=4326)
    else:
        gdf = gdf.to_crs(epsg=4326)

    gdf["geometry"] = gdf["geometry"].apply(normalize_geometry)
    gdf = gdf[gdf["geometry"].notnull()].copy()

    return gdf


def create_tables(conn):
    with conn.cursor() as cur:
        cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS regions (
                id uuid PRIMARY KEY,
                code varchar(50) UNIQUE NOT NULL,
                nom varchar(150) NOT NULL,
                geom geometry(MultiPolygon, 4326),
                created_at timestamptz DEFAULT now(),
                updated_at timestamptz DEFAULT now()
            );
            """
        )

        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS districts (
                id uuid PRIMARY KEY,
                code varchar(50) UNIQUE NOT NULL,
                nom varchar(150) NOT NULL,
                region_id uuid REFERENCES regions(id),
                geom geometry(MultiPolygon, 4326),
                created_at timestamptz DEFAULT now(),
                updated_at timestamptz DEFAULT now()
            );
            """
        )

        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS communes (
                id uuid PRIMARY KEY,
                code varchar(50) UNIQUE NOT NULL,
                nom varchar(150) NOT NULL,
                district_id uuid REFERENCES districts(id),
                geom geometry(MultiPolygon, 4326),
                created_at timestamptz DEFAULT now(),
                updated_at timestamptz DEFAULT now()
            );
            """
        )

        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_regions_geom
            ON regions USING GIST (geom);
            """
        )

        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_districts_geom
            ON districts USING GIST (geom);
            """
        )

        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_communes_geom
            ON communes USING GIST (geom);
            """
        )

    conn.commit()


def clear_tables(conn):
    """
    Nettoie les anciennes données dans l'ordre relationnel.
    """
    with conn.cursor() as cur:
        cur.execute("DELETE FROM communes;")
        cur.execute("DELETE FROM districts;")
        cur.execute("DELETE FROM regions;")
    conn.commit()


def geom_to_hex(geom) -> str | None:
    if geom is None:
        return None
    return wkb.dumps(geom, hex=True)


def upsert_region(conn, code: str, nom: str, geom_hex: str | None) -> str:
    region_id = str(uuid.uuid4())

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO regions (id, code, nom, geom, created_at, updated_at)
            VALUES (
                %s,
                %s,
                %s,
                CASE
                    WHEN (%s)::text IS NULL THEN NULL
                    ELSE ST_Multi(ST_SetSRID(ST_GeomFromWKB(decode(%s, 'hex')), 4326))
                END,
                now(),
                now()
            )
            ON CONFLICT (code)
            DO UPDATE SET
                nom = EXCLUDED.nom,
                geom = EXCLUDED.geom,
                updated_at = now()
            RETURNING id;
            """,
            (region_id, code, nom, geom_hex, geom_hex),
        )
        return str(cur.fetchone()[0])


def upsert_district(conn, code: str, nom: str, region_id: str, geom_hex: str | None) -> str:
    district_id = str(uuid.uuid4())

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO districts (id, code, nom, region_id, geom, created_at, updated_at)
            VALUES (
                %s,
                %s,
                %s,
                %s,
                CASE
                    WHEN (%s)::text IS NULL THEN NULL
                    ELSE ST_Multi(ST_SetSRID(ST_GeomFromWKB(decode(%s, 'hex')), 4326))
                END,
                now(),
                now()
            )
            ON CONFLICT (code)
            DO UPDATE SET
                nom = EXCLUDED.nom,
                region_id = EXCLUDED.region_id,
                geom = EXCLUDED.geom,
                updated_at = now()
            RETURNING id;
            """,
            (district_id, code, nom, region_id, geom_hex, geom_hex),
        )
        return str(cur.fetchone()[0])


def upsert_commune(conn, code: str, nom: str, district_id: str, geom_hex: str | None) -> str:
    commune_id = str(uuid.uuid4())

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO communes (id, code, nom, district_id, geom, created_at, updated_at)
            VALUES (
                %s,
                %s,
                %s,
                %s,
                CASE
                    WHEN (%s)::text IS NULL THEN NULL
                    ELSE ST_Multi(ST_SetSRID(ST_GeomFromWKB(decode(%s, 'hex')), 4326))
                END,
                now(),
                now()
            )
            ON CONFLICT (code)
            DO UPDATE SET
                nom = EXCLUDED.nom,
                district_id = EXCLUDED.district_id,
                geom = EXCLUDED.geom,
                updated_at = now()
            RETURNING id;
            """,
            (commune_id, code, nom, district_id, geom_hex, geom_hex),
        )
        return str(cur.fetchone()[0])


def import_regions(conn, gpkg_path: Path) -> dict[str, str]:
    gdf = read_layer(gpkg_path, REGIONS_LAYER)

    region_ids: dict[str, str] = {}

    for _, row in gdf.iterrows():
        code = str(row["GID_2"])
        nom = str(row["NAME_2"])
        geom_hex = geom_to_hex(row.geometry)

        region_id = upsert_region(conn, code, nom, geom_hex)
        region_ids[code] = region_id

    conn.commit()
    print(f"Régions importées : {len(region_ids)}")
    return region_ids


def import_districts(conn, gpkg_path: Path, region_ids: dict[str, str]) -> dict[str, str]:
    gdf = read_layer(gpkg_path, DISTRICTS_LAYER)

    district_ids: dict[str, str] = {}

    for _, row in gdf.iterrows():
        region_code = str(row["GID_2"])
        region_id = region_ids.get(region_code)

        if not region_id:
            print(f"Région introuvable pour district {row.get('NAME_3')}: {region_code}")
            continue

        code = str(row["GID_3"])
        nom = str(row["NAME_3"])
        geom_hex = geom_to_hex(row.geometry)

        district_id = upsert_district(conn, code, nom, region_id, geom_hex)
        district_ids[code] = district_id

    conn.commit()
    print(f"Districts importés : {len(district_ids)}")
    return district_ids


def import_communes(conn, gpkg_path: Path, district_ids: dict[str, str]) -> dict[str, str]:
    gdf = read_layer(gpkg_path, COMMUNES_LAYER)

    commune_ids: dict[str, str] = {}

    for _, row in gdf.iterrows():
        district_code = str(row["GID_3"])
        district_id = district_ids.get(district_code)

        if not district_id:
            print(f"District introuvable pour commune {row.get('NAME_4')}: {district_code}")
            continue

        code = str(row["GID_4"])
        nom = str(row["NAME_4"])
        geom_hex = geom_to_hex(row.geometry)

        commune_id = upsert_commune(conn, code, nom, district_id, geom_hex)
        commune_ids[code] = commune_id

    conn.commit()
    print(f"Communes importées : {len(commune_ids)}")
    return commune_ids


def main():
    gpkg_path = Path(os.getenv("GADM_GPKG_PATH", DEFAULT_GADM_PATH))

    if not gpkg_path.exists():
        raise FileNotFoundError(
            f"Fichier GADM introuvable : {gpkg_path}\n"
            "Télécharge-le avec :\n"
            "wget -O etl/data/geographie/gadm41_MDG.gpkg "
            "https://geodata.ucdavis.edu/gadm/gadm4.1/gpkg/gadm41_MDG.gpkg"
        )

    print(f"Connexion à : {DATABASE_URL}")
    print(f"Fichier GADM : {gpkg_path}")
    print("Mapping utilisé :")
    print(f"  regions   <- {REGIONS_LAYER} / GID_2 / NAME_2")
    print(f"  districts <- {DISTRICTS_LAYER} / GID_3 / NAME_3")
    print(f"  communes  <- {COMMUNES_LAYER} / GID_4 / NAME_4")

    with psycopg.connect(DATABASE_URL) as conn:
        create_tables(conn)
        clear_tables(conn)

        region_ids = import_regions(conn, gpkg_path)
        district_ids = import_districts(conn, gpkg_path, region_ids)
        commune_ids = import_communes(conn, gpkg_path, district_ids)

    print("Import géographique terminé.")
    print(f"Total régions  : {len(region_ids)}")
    print(f"Total districts: {len(district_ids)}")
    print(f"Total communes : {len(commune_ids)}")


if __name__ == "__main__":
    main()
