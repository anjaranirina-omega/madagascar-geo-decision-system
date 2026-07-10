def normalize_geometries(gdf, epsg: int = 4326):
    gdf = gdf.to_crs(epsg=epsg)
    gdf['geometry'] = gdf.geometry.buffer(0)
    return gdf
