import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import parseGeoraster from 'georaster';
import GeoRasterLayer from 'georaster-layer-for-leaflet';

export type RasterLayerType =
  | 'RISK_INDEX'
  | 'FLOOD_RISK_INDEX'
  | 'DROUGHT_RISK_INDEX';

type RasterRiskLayerProps = {
  visible: boolean;
  rasterType: RasterLayerType;
  onRasterLoaded?: (georaster: any | null) => void;
};

function getRiskColor(value: number | null | undefined) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value)) ||
    Number(value) < 0 ||
    Number(value) <= -9999
  ) {
    return null;
  }

  const numericValue = Number(value);

  if (numericValue <= 30) {
    return 'rgba(47, 158, 68, 0.62)';
  }

  if (numericValue <= 60) {
    return 'rgba(234, 179, 8, 0.62)';
  }

  if (numericValue <= 80) {
    return 'rgba(249, 115, 22, 0.68)';
  }

  return 'rgba(220, 38, 38, 0.72)';
}

function getRasterUrl(rasterType: RasterLayerType) {
  return `http://localhost:3001/api/rasters/latest/${rasterType}/file`;
}

export default function RasterRiskLayer({
  visible,
  rasterType,
  onRasterLoaded,
}: RasterRiskLayerProps) {
  const map = useMap();
  const layerRef = useRef<any>(null);
  const georasterRef = useRef<any>(null);
  const onRasterLoadedRef = useRef(onRasterLoaded);

  useEffect(() => {
    onRasterLoadedRef.current = onRasterLoaded;
  }, [onRasterLoaded]);

  useEffect(() => {
    let cancelled = false;

    async function loadRaster() {
      try {
        const rasterUrl = getRasterUrl(rasterType);

        const response = await fetch(rasterUrl);

        if (!response.ok) {
          throw new Error(
            `Impossible de charger le raster ${rasterType}. HTTP ${response.status}`,
          );
        }

        const arrayBuffer = await response.arrayBuffer();
        const georaster = await parseGeoraster(arrayBuffer);

        if (cancelled) {
          return;
        }

        georasterRef.current = georaster;
        onRasterLoadedRef.current?.(georaster);

        const rasterLayer = new GeoRasterLayer({
          georaster,
          opacity: 0.72,
          resolution: 256,
          pixelValuesToColorFn: (values: number[]) => {
            const value = values?.[0];
            return getRiskColor(value);
          },
        });

        layerRef.current = rasterLayer;

        if (visible) {
          rasterLayer.addTo(map);
        }

        console.log('[RasterRiskLayer] Raster chargé', {
          rasterType,
          width: georaster.width,
          height: georaster.height,
          xmin: georaster.xmin,
          ymax: georaster.ymax,
          pixelWidth: georaster.pixelWidth,
          pixelHeight: georaster.pixelHeight,
        });
      } catch (error) {
        console.error('[RasterRiskLayer] Erreur chargement raster:', error);
        onRasterLoadedRef.current?.(null);
      }
    }

    loadRaster();

    return () => {
      cancelled = true;

      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
      }

      layerRef.current = null;
      georasterRef.current = null;
      onRasterLoadedRef.current?.(null);
    };
  }, [map, rasterType, visible]);

  useEffect(() => {
    const layer = layerRef.current;

    if (!layer) {
      return;
    }

    if (visible) {
      if (!map.hasLayer(layer)) {
        layer.addTo(map);
      }

      if (georasterRef.current) {
        onRasterLoadedRef.current?.(georasterRef.current);
      }
    } else {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }

      onRasterLoadedRef.current?.(null);
    }
  }, [map, visible]);

  return null;
}
