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
    color: '#2563eb',
    weight: 1.6,
    fillOpacity: 0,
    opacity: 0.85,
  },
  districts: {
    color: '#0f766e',
    weight: 1,
    fillOpacity: 0,
    opacity: 0.7,
  },
  communes: {
    color: '#64748b',
    weight: 0.55,
    fillOpacity: 0,
    opacity: 0.55,
  },
};

const hoverStyle = {
  color: '#f97316',
  weight: 2.4,
  opacity: 0.95,
  fillOpacity: 0.08,
  fillColor: '#f97316',
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
            className: 'admin-boundary-tooltip',
          },
        );

        layer.on({
          mouseover: (event) => {
            const target = event.target;
            target.setStyle(hoverStyle);
            target.bringToFront?.();
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
