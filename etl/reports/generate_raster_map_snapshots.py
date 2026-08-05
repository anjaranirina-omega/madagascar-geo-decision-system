from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from PIL import Image, ImageDraw, ImageFont
from rasterio.features import rasterize


PROJECT_ROOT = Path(__file__).resolve().parents[2]
ETL_ROOT = PROJECT_ROOT / "etl"

RASTER_ROOT = ETL_ROOT / "data" / "raster"
OUTPUT_DIR = ETL_ROOT / "data" / "reports" / "maps"

GADM_PATH = ETL_ROOT / "data" / "geographie" / "gadm41_MDG.gpkg"
GADM_COUNTRY_LAYER = "ADM_ADM_0"

NODATA_THRESHOLD = -9999


MAP_CONFIGS = [
    {
        "title": "Risque climatique global",
        "input": RASTER_ROOT / "risk" / "risk_index.tif",
        "output": OUTPUT_DIR / "risk_global.png",
    },
    {
        "title": "Risque d’inondation",
        "input": RASTER_ROOT / "risk" / "flood" / "flood_risk_index.tif",
        "output": OUTPUT_DIR / "risk_flood.png",
    },
    {
        "title": "Risque sécheresse",
        "input": RASTER_ROOT / "risk" / "drought" / "drought_risk_index.tif",
        "output": OUTPUT_DIR / "risk_drought.png",
    },
    {
        "title": "Risque glissement de terrain",
        "input": RASTER_ROOT / "risk" / "landslide" / "landslide_risk_index.tif",
        "output": OUTPUT_DIR / "risk_landslide.png",
    },
    {
        "title": "Risque cyclonique",
        "input": RASTER_ROOT / "risk" / "cyclone" / "cyclone_risk_index.tif",
        "output": OUTPUT_DIR / "risk_cyclone.png",
    },
]


def get_font(size: int, bold: bool = False):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"
        if bold
        else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]

    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except Exception:
            continue

    return ImageFont.load_default()


def risk_color(value):
    if value <= 30:
        return (34, 197, 94, 220)      # vert
    if value <= 60:
        return (234, 179, 8, 225)      # jaune
    if value <= 80:
        return (249, 115, 22, 230)     # orange
    return (239, 68, 68, 235)          # rouge


def raster_to_rgba(data):
    height, width = data.shape
    rgba = np.zeros((height, width, 4), dtype=np.uint8)

    valid = np.isfinite(data) & (data > NODATA_THRESHOLD) & (data >= 0)

    for low, high, color in [
        (-np.inf, 30, (34, 197, 94, 220)),
        (30, 60, (234, 179, 8, 225)),
        (60, 80, (249, 115, 22, 230)),
        (80, np.inf, (239, 68, 68, 235)),
    ]:
        mask = valid & (data > low) & (data <= high)
        rgba[mask] = color

    return rgba, valid


def load_boundary_mask(src):
    if not GADM_PATH.exists():
        return None

    gdf = gpd.read_file(GADM_PATH, layer=GADM_COUNTRY_LAYER)

    if gdf.crs is None:
        gdf = gdf.set_crs(epsg=4326)

    gdf = gdf.to_crs(src.crs)
    boundaries = []

    for geom in gdf.geometry:
        if geom is None or geom.is_empty:
            continue

        if not geom.is_valid:
            geom = geom.buffer(0)

        if geom is not None and not geom.is_empty:
            boundaries.append(geom.boundary)

    if not boundaries:
        return None

    return rasterize(
        [(geom, 1) for geom in boundaries],
        out_shape=(src.height, src.width),
        transform=src.transform,
        fill=0,
        dtype="uint8",
        all_touched=True,
    )


def crop_to_valid(image: Image.Image, valid_mask, padding=18):
    rows, cols = np.where(valid_mask)

    if rows.size == 0 or cols.size == 0:
        return image

    min_row = max(int(rows.min()) - padding, 0)
    max_row = min(int(rows.max()) + padding, image.height - 1)
    min_col = max(int(cols.min()) - padding, 0)
    max_col = min(int(cols.max()) + padding, image.width - 1)

    return image.crop((min_col, min_row, max_col + 1, max_row + 1))


def add_layout(map_image: Image.Image, title: str):
    max_map_width = 900

    if map_image.width > max_map_width:
        ratio = max_map_width / map_image.width
        map_image = map_image.resize(
            (max_map_width, int(map_image.height * ratio)),
            Image.Resampling.LANCZOS,
        )

    title_height = 70
    legend_height = 58
    padding = 28

    canvas_width = map_image.width + padding * 2
    canvas_height = title_height + map_image.height + legend_height + padding

    canvas = Image.new("RGB", (canvas_width, canvas_height), "white")
    draw = ImageDraw.Draw(canvas)

    title_font = get_font(24, bold=True)
    small_font = get_font(13)
    legend_font = get_font(12, bold=True)

    draw.text((padding, 22), title, fill=(15, 23, 42), font=title_font)
    draw.text(
        (padding, 50),
        "RISKCLIM-MG • indice de risque 0–100 • données raster réelles",
        fill=(100, 116, 139),
        font=small_font,
    )

    canvas.paste(map_image.convert("RGB"), (padding, title_height))

    legend_y = title_height + map_image.height + 20
    legend_items = [
        ("Faible", "0–30", (34, 197, 94)),
        ("Moyen", "31–60", (234, 179, 8)),
        ("Élevé", "61–80", (249, 115, 22)),
        ("Critique", "81–100", (239, 68, 68)),
    ]

    x = padding

    for label, value_range, color in legend_items:
        draw.rounded_rectangle((x, legend_y, x + 18, legend_y + 18), radius=4, fill=color)
        draw.text((x + 26, legend_y - 1), label, fill=(15, 23, 42), font=legend_font)
        draw.text((x + 26, legend_y + 16), value_range, fill=(100, 116, 139), font=small_font)
        x += 150

    return canvas


def generate_snapshot(config):
    input_path = config["input"]
    output_path = config["output"]
    title = config["title"]

    if not input_path.exists():
        print(f"Raster absent, ignoré : {input_path}")
        return

    print(f"Génération carte rapport : {title}")

    with rasterio.open(input_path) as src:
        data = src.read(1).astype("float32")
        nodata = src.nodata

        if nodata is not None:
            data = np.where(data == nodata, np.nan, data)

        data = np.where(data <= NODATA_THRESHOLD, np.nan, data)
        data = np.where(data < 0, np.nan, data)

        rgba, valid = raster_to_rgba(data)
        boundary_mask = load_boundary_mask(src)

        if boundary_mask is not None:
            rgba[boundary_mask == 1] = (30, 64, 175, 255)

    image = Image.fromarray(rgba, mode="RGBA")

    # Fond blanc pour PDF
    white = Image.new("RGBA", image.size, "white")
    composed = Image.alpha_composite(white, image)

    cropped = crop_to_valid(composed, valid)
    final_image = add_layout(cropped, title)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    final_image.save(output_path, "PNG", optimize=True)

    print(f"OK : {output_path}")


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for config in MAP_CONFIGS:
        generate_snapshot(config)

    print("Cartes raster pour rapports générées.")


if __name__ == "__main__":
    main()
