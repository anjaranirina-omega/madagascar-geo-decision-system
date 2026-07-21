import { Crosshair, Layers, Map as MapIcon, Move } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from 'react-leaflet';
import type {
  LatLngBoundsExpression,
  LatLngExpression,
  Marker as LeafletMarker,
} from 'leaflet';
import type {
  BoundaryLevel,
  LocatedZone,
} from '../services/geographie.service';
import { geographieFrontendService } from '../services/geographie.service';
import AdminBoundariesLayer from './AdminBoundariesLayer';
import RasterRiskLayer from './RasterRiskLayer';
import RiskClickHandler from './RiskClickHandler';

const MADAGASCAR_CENTER: LatLngExpression = [-18.8792, 47.5079];

const MADAGASCAR_BOUNDS: LatLngBoundsExpression = [
  [-26.2, 42.8],
  [-11.0, 51.2],
];

const MADAGASCAR_MAX_BOUNDS: LatLngBoundsExpression = [
  [-30.0, 39.5],
  [-8.0, 55.0],
];

export default function MapView() {
  const markerRef = useRef<LeafletMarker | null>(null);

  const [showRiskRaster, setShowRiskRaster] = useState(true);
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [showReferencePoint, setShowReferencePoint] = useState(true);
  const [boundaryLevel, setBoundaryLevel] = useState<BoundaryLevel>('regions');
  const [georaster, setGeoraster] = useState<any | null>(null);

  const [markerPosition, setMarkerPosition] = useState<LatLngExpression>(
    MADAGASCAR_CENTER,
  );

  const [locatedZone, setLocatedZone] = useState<LocatedZone | null>(null);
  const [locating, setLocating] = useState(false);

  const markerLatLng = Array.isArray(markerPosition)
    ? {
        lat: markerPosition[0],
        lng: markerPosition[1],
      }
    : {
        lat: markerPosition.lat,
        lng: markerPosition.lng,
      };

  const locateMarker = useCallback(async (lat: number, lng: number) => {
    setLocating(true);

    try {
      const result = await geographieFrontendService.locate(lat, lng);
      setLocatedZone(result);

      setTimeout(() => {
        markerRef.current?.openPopup();
      }, 150);
    } catch (error) {
      console.error('[MapView] Erreur localisation administrative:', error);
      setLocatedZone(null);
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    locateMarker(markerLatLng.lat, markerLatLng.lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRasterLoaded = useCallback((raster: any | null) => {
    setGeoraster(raster);
  }, []);

  const markerEventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;

        if (!marker) {
          return;
        }

        const position = marker.getLatLng();
        setMarkerPosition([position.lat, position.lng]);
        locateMarker(position.lat, position.lng);
      },
    }),
    [locateMarker],
  );

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[330px_1fr]">
      <aside className="card p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 text-white">
            <Layers size={24} />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 dark:text-white">
              Couches cartographiques
            </h2>
            <p className="text-sm text-slate-500">
              Raster de risque et référentiels administratifs
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <LayerCheckbox
            checked={showRiskRaster}
            onChange={setShowRiskRaster}
            label="Indice de risque raster"
          />

          <LayerCheckbox
            checked={showBoundaries}
            onChange={setShowBoundaries}
            label="Limites administratives"
          />

          <select
            value={boundaryLevel}
            onChange={(event) =>
              setBoundaryLevel(event.target.value as BoundaryLevel)
            }
            disabled={!showBoundaries}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="regions">Régions</option>
            <option value="districts">Districts</option>
            <option value="communes">Communes</option>
          </select>

          <LayerCheckbox
            checked={showReferencePoint}
            onChange={setShowReferencePoint}
            label="Point de localisation mobile"
          />
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <h3 className="mb-4 font-extrabold text-slate-900 dark:text-white">
            Légende du risque
          </h3>

          <LegendItem color="#2f9e44" label="Faible" range="0–30" />
          <LegendItem color="#eab308" label="Moyen" range="31–60" />
          <LegendItem color="#f97316" label="Élevé" range="61–80" />
          <LegendItem color="#dc2626" label="Critique" range="81–100" />
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
          <div className="mb-2 flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
            <MapIcon size={18} />
            Interaction carte
          </div>

          {georaster ? (
            <>
              Cliquez sur Madagascar pour afficher :
              <br />
              <strong>indice de risque</strong>, <strong>niveau</strong> et{' '}
              <strong>coordonnées</strong>.
            </>
          ) : (
            <span className="font-semibold text-orange-600">
              Chargement du raster de risque...
            </span>
          )}
        </div>

        <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900 dark:bg-blue-950 dark:text-blue-100">
          <div className="mb-2 flex items-center gap-2 font-bold">
            <Move size={18} />
            Point mobile
          </div>

          Déplacez l’icône bleue pour identifier automatiquement la zone.

          <div className="mt-3 rounded-xl bg-white/70 p-3 dark:bg-slate-900">
            <strong>Lat :</strong> {markerLatLng.lat.toFixed(4)}
            <br />
            <strong>Lng :</strong> {markerLatLng.lng.toFixed(4)}
            <br />
            <strong>Région :</strong>{' '}
            {locating ? 'Recherche...' : locatedZone?.region?.nom ?? 'Hors zone'}
            <br />
            <strong>District :</strong>{' '}
            {locating ? 'Recherche...' : locatedZone?.district?.nom ?? '—'}
            <br />
            <strong>Commune :</strong>{' '}
            {locating ? 'Recherche...' : locatedZone?.commune?.nom ?? '—'}
          </div>
        </div>
      </aside>

      <section className="card overflow-hidden">
        <MapContainer
          bounds={MADAGASCAR_BOUNDS}
          maxBounds={MADAGASCAR_MAX_BOUNDS}
          maxBoundsViscosity={0.85}
          minZoom={5}
          zoom={6}
          scrollWheelZoom
          style={{ height: 'calc(100vh - 150px)', width: '100%' }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <RasterRiskLayer
            visible={showRiskRaster}
            onRasterLoaded={handleRasterLoaded}
          />

          <AdminBoundariesLayer
            visible={showBoundaries}
            level={boundaryLevel}
          />

          <RiskClickHandler georaster={georaster} />

          {showReferencePoint && (
            <Marker
              draggable
              eventHandlers={markerEventHandlers}
              position={markerPosition}
              ref={markerRef}
            >
              <Popup>
                <div style={{ minWidth: 230 }}>
                  <strong>Point de localisation</strong>
                  <br />
                  <br />
                  <strong>Latitude :</strong> {markerLatLng.lat.toFixed(5)}
                  <br />
                  <strong>Longitude :</strong> {markerLatLng.lng.toFixed(5)}
                  <br />
                  <br />
                  <strong>Région :</strong>{' '}
                  {locating ? 'Recherche...' : locatedZone?.region?.nom ?? 'Hors zone'}
                  <br />
                  <strong>District :</strong>{' '}
                  {locating ? 'Recherche...' : locatedZone?.district?.nom ?? '—'}
                  <br />
                  <strong>Commune :</strong>{' '}
                  {locating ? 'Recherche...' : locatedZone?.commune?.nom ?? '—'}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </section>
    </div>
  );
}

function LayerCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
      />
      <span className="font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </span>
    </label>
  );
}

function LegendItem({
  color,
  label,
  range,
}: {
  color: string;
  label: string;
  range: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between text-sm">
      <div className="flex items-center gap-3">
        <span
          className="h-4 w-4 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </span>
      </div>
      <span className="text-slate-500">{range}</span>
    </div>
  );
}
