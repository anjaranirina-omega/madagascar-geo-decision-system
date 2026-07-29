from pathlib import Path

import geopandas as gpd


ETL_ROOT = Path(__file__).resolve().parents[2]

HYDRO_RAW_DIR = ETL_ROOT / "data" / "hydrology" / "raw"
HYDRO_PROCESSED_DIR = ETL_ROOT / "data" / "hydrology" / "processed"

GADM_PATH = ETL_ROOT / "data" / "geographie" / "gadm41_MDG.gpkg"
GADM_LAYER = "ADM_ADM_0"

OUTPUT_GPKG = HYDRO_PROCESSED_DIR / "madagascar_rivers.gpkg"
OUTPUT_GEOJSON = HYDRO_PROCESSED_DIR / "madagascar_rivers.geojson"


def find_hydrorivers_shapefile() -> Path:
    candidates = list(HYDRO_RAW_DIR.rglob("HydroRIVERS_v10_af.shp"))
    if not candidates:
        raise FileNotFoundError(
            f"HydroRIVERS_v10_af.shp introuvable dans {HYDRO_RAW_DIR}. "
            "Vérifie que extract_hydrorivers.py a bien été exécuté."
        )
    return candidates[0]


def get_union_geometry(gdf: gpd.GeoDataFrame):
    """
    Compatibilité GeoPandas :
    - union_all() pour les versions récentes
    - unary_union pour les anciennes versions
    """
    if hasattr(gdf.geometry, "union_all"):
        return gdf.geometry.union_all()
    return gdf.geometry.unary_union


def main():
    HYDRO_PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    shp_path = find_hydrorivers_shapefile()

    print(f"Lecture limite Madagascar : {GADM_PATH}")
    madagascar = gpd.read_file(GADM_PATH, layer=GADM_LAYER)

    if madagascar.empty:
        raise RuntimeError("Limite Madagascar vide. Vérifie le fichier GADM.")

    print(f"Lecture CRS HydroRIVERS depuis : {shp_path}")
    rivers_crs = gpd.read_file(shp_path, rows=1).crs

    if rivers_crs is None:
        raise RuntimeError("CRS HydroRIVERS introuvable.")

    madagascar = madagascar.to_crs(rivers_crs)

    boundary = get_union_geometry(madagascar)
    minx, miny, maxx, maxy = madagascar.total_bounds
    bbox = (minx, miny, maxx, maxy)

    print("Filtrage spatial optimisé par bbox Madagascar...")
    print(f"BBOX : {bbox}")

    rivers_bbox = gpd.read_file(shp_path, bbox=bbox)

    print(f"Rivières candidates bbox : {len(rivers_bbox)}")

    if rivers_bbox.empty:
        raise RuntimeError("Aucune rivière trouvée dans la bbox de Madagascar.")

    print("Intersection précise avec la limite Madagascar...")
    rivers_mdg = rivers_bbox[rivers_bbox.intersects(boundary)].copy()

    print(f"Rivières intersectant Madagascar : {len(rivers_mdg)}")

    if rivers_mdg.empty:
        raise RuntimeError("Aucune rivière HydroRIVERS n'intersecte Madagascar.")

    rivers_mdg = rivers_mdg.to_crs("EPSG:4326")

    print(f"Export GeoPackage : {OUTPUT_GPKG}")
    if OUTPUT_GPKG.exists():
        OUTPUT_GPKG.unlink()

    rivers_mdg.to_file(OUTPUT_GPKG, layer="rivers", driver="GPKG")

    print(f"Export GeoJSON : {OUTPUT_GEOJSON}")
    if OUTPUT_GEOJSON.exists():
        OUTPUT_GEOJSON.unlink()

    rivers_mdg.to_file(OUTPUT_GEOJSON, driver="GeoJSON")

    print("Extraction Madagascar terminée avec succès.")
    print(f"Fichier principal : {OUTPUT_GPKG}")
    print(f"Nombre de tronçons : {len(rivers_mdg)}")


if __name__ == "__main__":
    main()
