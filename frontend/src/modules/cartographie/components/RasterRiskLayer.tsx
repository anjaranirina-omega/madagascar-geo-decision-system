import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import parseGeoraster from 'georaster';
import GeoRasterLayer from 'georaster-layer-for-leaflet';

type RasterRiskLayerProps = {
  visible: boolean;
};

function getRiskColor(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  if (value <= 30) {
    return 'rgba(47, 158, 68, 0.62)';
  }

  if (value <= 60) {
    return 'rgba(234, 179, 8, 0.62)';
  }

  if (value <= 80) {
    return 'rgba(249, 115, 22, 0.68)';
  }

  return 'rgba(220, 38, 38, 0.72)';
}

export default function RasterRiskLayer({ visible }: RasterRiskLayerProps) {
  const map = useMap();
  const [layer, setLayer] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    let rasterLayer: any = null;

    async function loadRaster() {
      if (!visible) {
        return;
      }

      try {
        const response = await fetch(
          'http://localhost:3001/api/rasters/latest/risk/file',
        );

        if (!response.ok) {
          throw new Error('Impossible de charger le raster de risque.');
        }

        const arrayBuffer = await response.arrayBuffer();
        const georaster = await parseGeoraster(arrayBuffer);

        if (!isMounted) {
          return;
        }

        rasterLayer = new GeoRasterLayer({
          georaster,
          opacity: 0.72,
          resolution: 256,
          pixelValuesToColorFn: (values: number[]) => {
            const value = values?.[0];
            return getRiskColor(value);
          },
        });

        rasterLayer.addTo(map);
        map.fitBounds(rasterLayer.getBounds());

        setLayer(rasterLayer);
      } catch (error) {
        console.error('[RasterRiskLayer] Erreur chargement raster:', error);
      }
    }

    loadRaster();

    return () => {
      isMounted = false;

      if (rasterLayer) {
        map.removeLayer(rasterLayer);
      }
    };
  }, [map, visible]);

  useEffect(() => {
    if (!layer) {
      return;
    }

    if (visible) {
      if (!map.hasLayer(layer)) {
        layer.addTo(map);
      }
    } else if (map.hasLayer(layer)) {
      map.removeLayer(layer);
    }
  }, [layer, map, visible]);

  return null;
}
