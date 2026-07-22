import L from 'leaflet';
import { useMap, useMapEvents } from 'react-leaflet';

type RiskClickHandlerProps = {
  georaster: any | null;
};

function classifyRisk(value: number) {
  if (value <= 30) {
    return {
      label: 'Faible',
      color: '#2f9e44',
    };
  }

  if (value <= 60) {
    return {
      label: 'Moyen',
      color: '#eab308',
    };
  }

  if (value <= 80) {
    return {
      label: 'Élevé',
      color: '#f97316',
    };
  }

  return {
    label: 'Critique',
    color: '#dc2626',
  };
}

function sampleRasterValue(georaster: any, lat: number, lng: number) {
  if (!georaster) {
    return null;
  }

  const xmin = Number(georaster.xmin);
  const ymax = Number(georaster.ymax);
  const pixelWidth = Math.abs(Number(georaster.pixelWidth));
  const pixelHeight = Math.abs(Number(georaster.pixelHeight));
  const width = Number(georaster.width);
  const height = Number(georaster.height);
  const noDataValue = georaster.noDataValue;

  if (
    !Number.isFinite(xmin) ||
    !Number.isFinite(ymax) ||
    !Number.isFinite(pixelWidth) ||
    !Number.isFinite(pixelHeight) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    console.warn('[RiskClickHandler] Métadonnées georaster invalides', {
      xmin,
      ymax,
      pixelWidth,
      pixelHeight,
      width,
      height,
      georaster,
    });
    return null;
  }

  const col = Math.floor((lng - xmin) / pixelWidth);
  const row = Math.floor((ymax - lat) / pixelHeight);

  if (row < 0 || col < 0 || row >= height || col >= width) {
    return null;
  }

  const band = georaster.values?.[0];

  if (!band) {
    console.warn('[RiskClickHandler] Bande raster absente');
    return null;
  }

  const value = band?.[row]?.[col];

  if (
    value === undefined ||
    value === null ||
    Number.isNaN(Number(value)) ||
    value === noDataValue ||
    Number(value) < 0 ||
    Number(value) <= -9999
  ) {
    return null;
  }

  return Number(value);
}

function openRiskPopup(
  map: L.Map,
  latlng: L.LatLng,
  value: number | null,
) {
  const lat = latlng.lat;
  const lng = latlng.lng;

  if (value === null) {
    L.popup()
      .setLatLng(latlng)
      .setContent(
        `
        <div style="font-family: system-ui; min-width: 210px">
          <div style="font-size: 14px; font-weight: 800; margin-bottom: 8px">
            Aucune donnée raster
          </div>
          <div style="color:#64748b; font-size:12px">
            Coordonnées : ${lat.toFixed(4)}, ${lng.toFixed(4)}
          </div>
        </div>
        `,
      )
      .openOn(map);

    return;
  }

  const risk = classifyRisk(value);

  L.popup()
    .setLatLng(latlng)
    .setContent(
      `
      <div style="font-family: system-ui; min-width: 230px">
        <div style="font-size: 14px; font-weight: 800; margin-bottom: 8px">
          Valeur du risque
        </div>

        <div style="margin-bottom: 6px">
          <strong>Indice :</strong> ${value.toFixed(2)} / 100
        </div>

        <div style="margin-bottom: 6px">
          <strong>Niveau :</strong>
          <span style="
            display:inline-block;
            margin-left:6px;
            padding:3px 8px;
            border-radius:999px;
            background:${risk.color}22;
            color:${risk.color};
            font-weight:800;
          ">
            ${risk.label}
          </span>
        </div>

        <div style="color:#64748b; font-size:12px">
          Coordonnées : ${lat.toFixed(4)}, ${lng.toFixed(4)}
        </div>
      </div>
      `,
    )
    .openOn(map);
}

export default function RiskClickHandler({ georaster }: RiskClickHandlerProps) {
  const map = useMap();

  useMapEvents({
    click: (event) => {
      if (!georaster) {
        L.popup()
          .setLatLng(event.latlng)
          .setContent(
            `
            <div style="font-family: system-ui; min-width: 210px">
              <strong>Raster non chargé</strong><br/>
              <span style="color:#64748b; font-size:12px">
                Attendez le chargement de la couche de risque.
              </span>
            </div>
            `,
          )
          .openOn(map);
        return;
      }

      const value = sampleRasterValue(
        georaster,
        event.latlng.lat,
        event.latlng.lng,
      );

      openRiskPopup(map, event.latlng, value);
    },
  });

  return null;
}
