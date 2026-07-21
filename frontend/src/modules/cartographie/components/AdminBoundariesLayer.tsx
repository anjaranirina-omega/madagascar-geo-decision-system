import { useEffect, useState } from 'react';
import { GeoJSON } from 'react-leaflet';
import type { BoundaryLevel } from '../services/geographie.service';
import { geographieFrontendService } from '../services/geographie.service';

type AdminBoundariesLayerProps = {
  visible: boolean;
  level: BoundaryLevel;
};

const styleByLevel = {
  regions: {
    color: '#111827',
    weight: 1.4,
    fillOpacity: 0,
    opacity: 0.75,
  },
  districts: {
    color: '#2563eb',
    weight: 0.9,
    fillOpacity: 0,
    opacity: 0.55,
  },
  communes: {
    color: '#16a34a',
    weight: 0.45,
    fillOpacity: 0,
    opacity: 0.45,
  },
};

export default function AdminBoundariesLayer({
  visible,
  level,
}: AdminBoundariesLayerProps) {
  const [geojson, setGeojson] = useState<any>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const data = await geographieFrontendService.getGeoJson(level);

        if (!cancelled) {
          setGeojson(data);
        }
      } catch (error) {
        console.error('[AdminBoundariesLayer] Erreur chargement GeoJSON:', error);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [visible, level]);

  if (!visible || !geojson) {
    return null;
  }

  return (
    <GeoJSON
      key={`${level}-${geojson.features?.length ?? 0}`}
      data={geojson}
      style={() => ({
        ...styleByLevel[level],
        bubblingMouseEvents: true,
      })}
      onEachFeature={(feature, layer) => {
        const props = feature.properties ?? {};

        layer.bindTooltip(
          `<strong>${props.nom ?? 'Zone'}</strong><br/>${props.type ?? level}`,
          {
            sticky: true,
            direction: 'top',
          },
        );

        layer.on({
          mouseover: (event) => {
            const target = event.target;
            target.setStyle({
              weight: 2.4,
              color: '#ef4444',
            });
          },
          mouseout: (event) => {
            const target = event.target;
            target.setStyle(styleByLevel[level]);
          },
        });
      }}
    />
  );
}
