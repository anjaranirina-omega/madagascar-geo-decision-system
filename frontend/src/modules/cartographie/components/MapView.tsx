import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Crosshair,
  Download,
  Droplets,
  Expand,
  Filter,
  Layers,
  Map as MapIcon,
  Minus,
  Move,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Waves,
  Wind,
  Zap,
  Thermometer,
  CloudRain,
  Leaf,
  Users,
  Clock,
  Lightbulb,
  Ruler,
} from 'lucide-react';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import type {
  LatLngBoundsExpression,
  LatLngExpression,
  Marker as LeafletMarker,
} from 'leaflet';
import type {
  BoundaryLevel,
  LocatedZone,
  ZoneSummary,
  SearchResultItem,
} from '../services/geographie.service';
import { geographieFrontendService } from '../services/geographie.service';
import AdminBoundariesLayer from './AdminBoundariesLayer';
import RasterRiskLayer from './RasterRiskLayer';
import { meteoService, type CurrentWeather } from '../../meteo/services/meteo.service';
import RiskClickHandler, { RiskSelection } from './RiskClickHandler';

const MADAGASCAR_CENTER: LatLngExpression = [-18.8792, 47.5079];

const MADAGASCAR_BOUNDS: LatLngBoundsExpression = [
  [-26.2, 42.8],
  [-11.0, 51.2],
];

const MADAGASCAR_MAX_BOUNDS: LatLngBoundsExpression = [
  [-30.0, 39.5],
  [-8.0, 55.0],
];

type RiskLayerKey =
  | 'global'
  | 'flood'
  | 'cyclone'
  | 'drought'
  | 'landslide'
  | 'temperature'
  | 'rainfall'
  | 'wind'
  | 'vulnerability';

type SearchResult = SearchResultItem & {
  level: BoundaryLevel;
  label: string;
};

const riskPanelClasses: Record<string, string> = {
  Faible:
    'border-green-100 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200',
  Moyen:
    'border-yellow-100 bg-yellow-50 text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-200',
  Élevé:
    'border-orange-100 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-200',
  Critique:
    'border-red-100 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200',
};

const riskBadgeClasses: Record<string, string> = {
  Faible: 'bg-green-100 text-green-700 border-green-200',
  Moyen: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Élevé: 'bg-orange-100 text-orange-700 border-orange-200',
  Critique: 'bg-red-100 text-red-700 border-red-200',
};


function classifyLocalRisk(value: number) {
  if (value <= 30) {
    return {
      level: 'Faible' as const,
      color: '#2f9e44',
    };
  }

  if (value <= 60) {
    return {
      level: 'Moyen' as const,
      color: '#eab308',
    };
  }

  if (value <= 80) {
    return {
      level: 'Élevé' as const,
      color: '#f97316',
    };
  }

  return {
    level: 'Critique' as const,
    color: '#dc2626',
  };
}

function sampleRasterValueAtPoint(georaster: any, lat: number, lng: number) {
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
    return null;
  }

  const col = Math.floor((lng - xmin) / pixelWidth);
  const row = Math.floor((ymax - lat) / pixelHeight);

  if (row < 0 || col < 0 || row >= height || col >= width) {
    return null;
  }

  const value = georaster.values?.[0]?.[row]?.[col];

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

export default function MapView() {
  const markerRef = useRef<LeafletMarker | null>(null);

  const [riskLayers, setRiskLayers] = useState<Record<RiskLayerKey, boolean>>({
    global: true,
    flood: false,
    cyclone: false,
    drought: false,
    landslide: false,
    temperature: false,
    rainfall: false,
    wind: false,
    vulnerability: false,
  });

  const [showBoundaries, setShowBoundaries] = useState(true);
  const [showReferencePoint, setShowReferencePoint] = useState(true);
  const [boundaryLevel, setBoundaryLevel] = useState<BoundaryLevel>('regions');
  const [georaster, setGeoraster] = useState<any | null>(null);

  const [markerPosition, setMarkerPosition] = useState<LatLngExpression>(
    MADAGASCAR_CENTER,
  );

  const [locatedZone, setLocatedZone] = useState<LocatedZone | null>(null);
  const [zoneSummary, setZoneSummary] = useState<ZoneSummary | null>(null);
  const [locating, setLocating] = useState(false);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<RiskSelection | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedBoundaryFeature, setSelectedBoundaryFeature] = useState<any | null>(null);

  const [riskTypeFilter, setRiskTypeFilter] = useState('GLOBAL');
  const [riskLevelFilter, setRiskLevelFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');

  const markerLatLng = Array.isArray(markerPosition)
    ? {
        lat: markerPosition[0],
        lng: markerPosition[1],
      }
    : {
        lat: markerPosition.lat,
        lng: markerPosition.lng,
      };

  const showRiskRaster = riskLayers.global;

  const selectedLevel = selectedRisk?.level ?? 'Moyen';
  const selectedValue = selectedRisk?.value ?? 56.4;
  const selectedZoneName =
    locatedZone?.commune?.nom ??
    locatedZone?.district?.nom ??
    locatedZone?.region?.nom ??
    selectedBoundaryFeature?.properties?.nom ??
    'Zone non sélectionnée';

  const selectedRegionName =
    locatedZone?.region?.nom ??
    selectedBoundaryFeature?.properties?.region?.nom ??
    selectedBoundaryFeature?.properties?.nom ??
    'Madagascar';

  const loadZoneSummary = useCallback(async (type: string, id: string) => {
    try {
      const summary = await geographieFrontendService.getSummary(type, id);
      setZoneSummary(summary);
    } catch (error) {
      console.error('[MapView] Erreur chargement résumé zone:', error);
      setZoneSummary(null);
    }
  }, []);

  const loadWeather = useCallback(async (lat: number, lng: number) => {
    setWeatherLoading(true);
    setWeatherError('');

    try {
      const weather = await meteoService.getCurrent(lat, lng);
      setCurrentWeather(weather);
    } catch (error) {
      console.error('[MapView] Erreur météo temps réel:', error);
      setCurrentWeather(null);
      setWeatherError('Météo indisponible');
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  const locateMarker = useCallback(async (lat: number, lng: number) => {
    setLocating(true);

    try {
      const result = await geographieFrontendService.locate(lat, lng);
      setLocatedZone(result);

      if (result.commune) {
        await loadZoneSummary('commune', result.commune.id);
      } else if (result.district) {
        await loadZoneSummary('district', result.district.id);
      } else if (result.region) {
        await loadZoneSummary('region', result.region.id);
      } else {
        setZoneSummary(null);
      }

      setTimeout(() => {
        markerRef.current?.openPopup();
      }, 120);
    } catch (error) {
      console.error('[MapView] Erreur localisation administrative:', error);
      setLocatedZone(null);
    } finally {
      setLocating(false);
    }
  }, [loadZoneSummary]);

  useEffect(() => {
    locateMarker(markerLatLng.lat, markerLatLng.lng);
    loadWeather(markerLatLng.lat, markerLatLng.lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;

    const timeout = window.setTimeout(async () => {
      try {
        const response = await geographieFrontendService.search(query);

        if (cancelled) return;

        const results: SearchResult[] = [
          ...response.regions.map((item) => ({
            ...item,
            level: 'regions' as BoundaryLevel,
            label: 'Région',
          })),
          ...response.districts.map((item) => ({
            ...item,
            level: 'districts' as BoundaryLevel,
            label: 'District',
          })),
          ...response.communes.map((item) => ({
            ...item,
            level: 'communes' as BoundaryLevel,
            label: 'Commune',
          })),
        ];

        setSearchResults(results);
        setSearchOpen(true);
      } catch (error) {
        console.error('[MapView] Erreur recherche:', error);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [searchQuery]);

  const handleRasterLoaded = useCallback((raster: any | null) => {
    setGeoraster(raster);
  }, []);

  const updateRiskFromMarkerPosition = useCallback(
    (lat: number, lng: number) => {
      if (!georaster) {
        return;
      }

      const value = sampleRasterValueAtPoint(georaster, lat, lng);

      if (value === null) {
        setSelectedRisk({
          value: null,
          latitude: lat,
          longitude: lng,
        });
        return;
      }

      const risk = classifyLocalRisk(value);

      setSelectedRisk({
        value,
        level: risk.level,
        color: risk.color,
        latitude: lat,
        longitude: lng,
      });
    },
    [georaster],
  );

  useEffect(() => {
    if (!georaster) {
      return;
    }

    updateRiskFromMarkerPosition(markerLatLng.lat, markerLatLng.lng);
  }, [
    georaster,
    markerLatLng.lat,
    markerLatLng.lng,
    updateRiskFromMarkerPosition,
  ]);

  const markerEventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;

        if (!marker) return;

        const position = marker.getLatLng();
        setMarkerPosition([position.lat, position.lng]);
        locateMarker(position.lat, position.lng);
        loadWeather(position.lat, position.lng);
        updateRiskFromMarkerPosition(position.lat, position.lng);
      },
    }),
    [locateMarker, loadWeather, updateRiskFromMarkerPosition],
  );

  const toggleRiskLayer = (key: RiskLayerKey, value: boolean) => {
    setRiskLayers((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSelectSearchResult = async (result: SearchResult) => {
    setSearchQuery(result.nom);
    setSearchOpen(false);
    setBoundaryLevel(result.level);
    setShowBoundaries(true);

    try {
      const feature = await geographieFrontendService.getFeature(
        result.level,
        result.id,
      );

      setSelectedBoundaryFeature(feature);
      await loadZoneSummary(result.level, result.id);
    } catch (error) {
      console.error('[MapView] Erreur chargement feature sélectionnée:', error);
    }
  };

  return (
    <div className="space-y-5">
      <MapFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        searchResults={searchResults}
        onSelectSearchResult={handleSelectSearchResult}
        riskTypeFilter={riskTypeFilter}
        setRiskTypeFilter={setRiskTypeFilter}
        riskLevelFilter={riskLevelFilter}
        setRiskLevelFilter={setRiskLevelFilter}
        sourceFilter={sourceFilter}
        setSourceFilter={setSourceFilter}
      />

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[330px_1fr_350px]">
        <aside className="card h-[calc(100vh-210px)] overflow-y-auto p-5">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 text-white">
                <Layers size={24} />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 dark:text-white">
                  Couches cartographiques
                </h2>
                <p className="text-sm text-slate-500">
                  Raster de risque et référentiels
                </p>
              </div>
            </div>
            <ChevronDown size={18} className="text-slate-400" />
          </div>

          <div className="space-y-3">
            <LayerCheckbox
              checked={riskLayers.global}
              onChange={(value) => toggleRiskLayer('global', value)}
              label="Risque global"
              subtitle="Indice composite global"
              icon={<Shield size={16} />}
            />

            <LayerCheckbox
              checked={riskLayers.flood}
              onChange={(value) => toggleRiskLayer('flood', value)}
              label="Risque inondation"
              subtitle="Couche spécifique à venir"
              icon={<Waves size={16} />}
              disabled
            />

            <LayerCheckbox
              checked={riskLayers.cyclone}
              onChange={(value) => toggleRiskLayer('cyclone', value)}
              label="Risque cyclone"
              subtitle="Couche spécifique à venir"
              icon={<Zap size={16} />}
              disabled
            />

            <LayerCheckbox
              checked={riskLayers.drought}
              onChange={(value) => toggleRiskLayer('drought', value)}
              label="Risque sécheresse"
              subtitle="Couche spécifique à venir"
              icon={<Droplets size={16} />}
              disabled
            />

            <LayerCheckbox
              checked={riskLayers.landslide}
              onChange={(value) => toggleRiskLayer('landslide', value)}
              label="Risque glissement de terrain"
              subtitle="Couche spécifique à venir"
              icon={<AlertTriangle size={16} />}
              disabled
            />

            <LayerCheckbox
              checked={riskLayers.temperature}
              onChange={(value) => toggleRiskLayer('temperature', value)}
              label="Température"
              subtitle="NASA POWER plus tard"
              icon={<Thermometer size={16} />}
              disabled
            />

            <LayerCheckbox
              checked={riskLayers.rainfall}
              onChange={(value) => toggleRiskLayer('rainfall', value)}
              label="Précipitations"
              subtitle="CHIRPS intégré dans le risque global"
              icon={<CloudRain size={16} />}
              disabled
            />

            <LayerCheckbox
              checked={riskLayers.wind}
              onChange={(value) => toggleRiskLayer('wind', value)}
              label="Vent"
              subtitle="OpenWeather plus tard"
              icon={<Wind size={16} />}
              disabled
            />

            <LayerCheckbox
              checked={riskLayers.vulnerability}
              onChange={(value) => toggleRiskLayer('vulnerability', value)}
              label="Vulnérabilité"
              subtitle="WorldPop + WorldCover"
              icon={<Users size={16} />}
              disabled
            />

            <LayerCheckbox
              checked={showBoundaries}
              onChange={setShowBoundaries}
              label="Limites administratives"
              subtitle="Régions, districts, communes"
              icon={<Layers size={16} />}
            />

            <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="mb-3 text-sm font-extrabold text-slate-700 dark:text-slate-200">
                Niveau administratif
              </div>

              <div className="space-y-2">
                <RadioLevel
                  value="regions"
                  label="Régions"
                  current={boundaryLevel}
                  onChange={setBoundaryLevel}
                />
                <RadioLevel
                  value="districts"
                  label="Districts"
                  current={boundaryLevel}
                  onChange={setBoundaryLevel}
                />
                <RadioLevel
                  value="communes"
                  label="Communes"
                  current={boundaryLevel}
                  onChange={setBoundaryLevel}
                />
              </div>
            </div>

            <LayerCheckbox
              checked={showReferencePoint}
              onChange={setShowReferencePoint}
              label="Point de localisation mobile"
              subtitle="Déplaçable sur la carte"
              icon={<Move size={16} />}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setRiskLayers({
                global: true,
                flood: false,
                cyclone: false,
                drought: false,
                landslide: false,
                temperature: false,
                rainfall: false,
                wind: false,
                vulnerability: false,
              });
              setShowBoundaries(true);
              setBoundaryLevel('regions');
              setShowReferencePoint(true);
            }}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 text-sm font-extrabold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200"
          >
            <RotateCcw size={17} />
            Réinitialiser les couches
          </button>
        </aside>

        <section className="card relative overflow-hidden">
          <MapContainer
            bounds={MADAGASCAR_BOUNDS}
            maxBounds={MADAGASCAR_MAX_BOUNDS}
            maxBoundsViscosity={0.85}
            minZoom={5}
            zoom={6}
            zoomControl={false}
            scrollWheelZoom
            style={{ height: 'calc(100vh - 210px)', width: '100%' }}
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

            {selectedBoundaryFeature && (
              <SelectedBoundaryLayer feature={selectedBoundaryFeature} />
            )}

            <RiskClickHandler
              georaster={georaster}
              onRiskSelected={setSelectedRisk}
            />

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
                    {locating
                      ? 'Recherche...'
                      : locatedZone?.region?.nom ?? 'Hors zone'}
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

            <MapToolbar />
          </MapContainer>

          <div className="absolute bottom-5 left-1/2 z-[500] w-[78%] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
            <div className="mb-3 font-extrabold text-slate-900 dark:text-white">
              Niveau de risque
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
              <LegendItem color="#2f9e44" label="Faible" range="0-30" />
              <LegendItem color="#eab308" label="Moyen" range="31-60" />
              <LegendItem color="#f97316" label="Élevé" range="61-80" />
              <LegendItem color="#dc2626" label="Critique" range="81-100" />
            </div>
          </div>
        </section>

        <aside className="card h-[calc(100vh-210px)] overflow-y-auto p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-extrabold text-slate-900 dark:text-white">
              Informations de la zone sélectionnée
            </h2>
            <ChevronDown size={18} className="text-slate-400" />
          </div>

          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700">
              <MapIcon size={24} />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900 dark:text-white">
                {selectedZoneName}
              </div>
              <div className="text-sm text-slate-500">
                Région {selectedRegionName}
              </div>
            </div>
          </div>

          <div
            className={[
              'mb-5 rounded-3xl border p-5',
              riskPanelClasses[selectedLevel],
            ].join(' ')}
          >
            <div className="text-sm font-extrabold">
              Risque local
            </div>

            <div className="mt-3 flex items-end gap-2">
              <div className="text-5xl font-black">
                {selectedValue.toFixed(0)}
              </div>
              <div className="mb-2 font-bold">/100</div>

              <span
                className={[
                  'mb-2 ml-auto rounded-full border px-3 py-1 text-xs font-extrabold',
                  riskBadgeClasses[selectedLevel],
                ].join(' ')}
              >
                {selectedLevel}
              </span>
            </div>

            <div className="mt-4 text-sm">
              Tendance : <span className="font-bold">+12%</span> sur 7 derniers
              jours
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3">
            <InfoCard
              icon={<Users size={20} />}
              label="Population exposée"
              value={formatPopulation(zoneSummary?.populationExposed)}
              sub="habitants"
            />
            <InfoCard
              icon={<Ruler size={20} />}
              label="Superficie"
              value={formatArea(zoneSummary?.areaKm2)}
              sub="km²"
            />
            <InfoCard
              icon={<AlertTriangle size={20} />}
              label="Alertes actives"
              value={String(zoneSummary?.activeAlerts ?? 0)}
              sub="voir détails"
              danger
            />
            <InfoCard
              icon={<Clock size={20} />}
              label="Dernière mise à jour"
              value={formatDateOnly(zoneSummary?.lastUpdated)}
              sub={formatTimeOnly(zoneSummary?.lastUpdated)}
            />
          </div>

          <div className="mb-5 rounded-3xl border border-sky-100 bg-sky-50 p-5 dark:border-sky-900 dark:bg-sky-950/30">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-extrabold text-slate-900 dark:text-white">
                Météo actuelle
              </div>

              <button
                type="button"
                onClick={() => loadWeather(markerLatLng.lat, markerLatLng.lng)}
                className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-sky-700 shadow-sm transition hover:bg-sky-100 dark:bg-slate-900 dark:text-sky-200"
              >
                Actualiser
              </button>
            </div>

            {weatherLoading ? (
              <div className="text-sm font-semibold text-sky-700">
                Chargement météo...
              </div>
            ) : weatherError ? (
              <div className="text-sm font-semibold text-red-600">
                {weatherError}
              </div>
            ) : currentWeather ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <WeatherItem
                  label="Température"
                  value={
                    typeof currentWeather.temperature === 'number'
                      ? `${currentWeather.temperature.toFixed(1)} °C`
                      : '—'
                  }
                />
                <WeatherItem
                  label="Humidité"
                  value={
                    typeof currentWeather.humidity === 'number'
                      ? `${currentWeather.humidity} %`
                      : '—'
                  }
                />
                <WeatherItem
                  label="Vent"
                  value={
                    typeof currentWeather.windSpeed === 'number'
                      ? `${(currentWeather.windSpeed * 3.6).toFixed(1)} km/h`
                      : '—'
                  }
                />
                <WeatherItem
                  label="Pluie"
                  value={
                    typeof currentWeather.rainfall === 'number'
                      ? `${currentWeather.rainfall.toFixed(1)} mm`
                      : '0 mm'
                  }
                />

                <div className="col-span-2 rounded-xl bg-white/70 p-3 dark:bg-slate-900">
                  <div className="text-xs font-bold text-slate-500">
                    Conditions
                  </div>
                  <div className="mt-1 font-semibold text-slate-800 dark:text-slate-100">
                    {currentWeather.weatherDescription ?? currentWeather.weatherMain ?? '—'}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Observation : {formatDateTime(currentWeather.observedAt)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">
                Déplacez le marqueur pour charger la météo.
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-yellow-100 bg-yellow-50 p-5 dark:border-yellow-900 dark:bg-yellow-950/30">
            <div className="mb-4 flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
              <Lightbulb size={21} className="text-yellow-500" />
              Recommandations
            </div>

            <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
              {[
                'Surveiller l’évolution des précipitations',
                'Vérifier les zones inondables',
                'Préparer les équipes d’intervention',
                'Informer la population locale',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2
                    size={17}
                    className="mt-0.5 shrink-0 text-green-600"
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <button className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-extrabold text-white transition hover:bg-blue-700">
            Voir le détail complet
          </button>
        </aside>
      </div>
    </div>
  );
}

function MapFilters({
  searchQuery,
  setSearchQuery,
  searchOpen,
  setSearchOpen,
  searchResults,
  onSelectSearchResult,
  riskTypeFilter,
  setRiskTypeFilter,
  riskLevelFilter,
  setRiskLevelFilter,
  sourceFilter,
  setSourceFilter,
}: {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchOpen: boolean;
  setSearchOpen: (value: boolean) => void;
  searchResults: SearchResult[];
  onSelectSearchResult: (result: SearchResult) => void;
  riskTypeFilter: string;
  setRiskTypeFilter: (value: string) => void;
  riskLevelFilter: string;
  setRiskLevelFilter: (value: string) => void;
  sourceFilter: string;
  setSourceFilter: (value: string) => void;
}) {
  return (
    <div className="card grid grid-cols-1 gap-4 p-4 xl:grid-cols-[1.5fr_0.8fr_0.8fr_0.9fr_auto]">
      <div className="relative">
        <div className="flex h-12 items-center rounded-xl border border-slate-300 px-4 dark:border-slate-800 dark:bg-slate-950">
          <Search size={20} className="mr-3 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Rechercher une région, district ou commune..."
            className="h-full w-full bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
        </div>

        {searchOpen && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-14 z-[900] max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            {searchResults.map((result) => (
              <button
                key={`${result.level}-${result.id}`}
                type="button"
                onClick={() => onSelectSearchResult(result)}
                className="block w-full border-b border-slate-100 px-4 py-3 text-left text-sm transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
              >
                <div className="font-extrabold text-slate-900 dark:text-white">
                  {result.nom}
                </div>
                <div className="text-xs text-slate-500">
                  {result.label} • {result.code}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <FilterSelect
        label="Type de risque"
        value={riskTypeFilter}
        onChange={setRiskTypeFilter}
        options={[
          ['GLOBAL', 'Risque global'],
          ['FLOOD', 'Inondation bientôt'],
          ['CYCLONE', 'Cyclone bientôt'],
          ['DROUGHT', 'Sécheresse bientôt'],
        ]}
      />

      <FilterSelect
        label="Niveau de risque"
        value={riskLevelFilter}
        onChange={setRiskLevelFilter}
        options={[
          ['ALL', 'Tous'],
          ['LOW', 'Faible'],
          ['MEDIUM', 'Moyen'],
          ['HIGH', 'Élevé'],
          ['CRITICAL', 'Critique'],
        ]}
      />

      <FilterSelect
        label="Source de données"
        value={sourceFilter}
        onChange={setSourceFilter}
        options={[
          ['ALL', 'Toutes'],
          ['CHIRPS', 'CHIRPS'],
          ['COP30', 'Copernicus DEM'],
          ['WORLDPOP', 'WorldPop'],
          ['WORLDCOVER', 'WorldCover'],
        ]}
      />

      <button
        type="button"
        onClick={() =>
          alert(
            'Les filtres avancés seront disponibles avec les couches de risques spécifiques.',
          )
        }
        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <Filter size={18} />
        Filtres avancés
      </button>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-bold text-slate-500">{label}</div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
      >
        {options.map(([valueOption, labelOption]) => (
          <option key={valueOption} value={valueOption}>
            {labelOption}
          </option>
        ))}
      </select>
    </div>
  );
}

function LayerCheckbox({
  checked,
  onChange,
  label,
  subtitle,
  icon,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  subtitle?: string;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={[
        'flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 transition dark:border-slate-800',
        disabled
          ? 'opacity-55'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800',
      ].join(' ')}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
      />
      <span className="text-slate-500">{icon}</span>
      <span>
        <span className="block font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </span>
        {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
      </span>
    </label>
  );
}

function RadioLevel({
  value,
  label,
  current,
  onChange,
}: {
  value: BoundaryLevel;
  label: string;
  current: BoundaryLevel;
  onChange: (level: BoundaryLevel) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
      <input
        type="radio"
        checked={current === value}
        onChange={() => onChange(value)}
        className="text-blue-600 focus:ring-blue-500"
      />
      {label}
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
    <div className="flex items-center gap-2">
      <span
        className="h-3 w-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <span className="ml-auto text-slate-500">{range}</span>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  sub,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div className={danger ? 'text-red-600' : 'text-slate-500'}>{icon}</div>
      <div className="mt-2 text-xs font-bold text-slate-500">{label}</div>
      <div
        className={
          danger
            ? 'mt-1 text-2xl font-black text-red-600'
            : 'mt-1 text-2xl font-black text-slate-900 dark:text-white'
        }
      >
        {value}
      </div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function SelectedBoundaryLayer({ feature }: { feature: any }) {
  const map = useMap();

  return (
    <GeoJSON
      key={feature.properties?.id}
      data={feature}
      style={() => ({
        color: '#2563eb',
        weight: 3,
        fillColor: '#2563eb',
        fillOpacity: 0.08,
      })}
      eventHandlers={{
        add: (event) => {
          const layer: any = event.target;
          if (layer.getBounds) {
            map.fitBounds(layer.getBounds(), {
              padding: [30, 30],
              maxZoom: 8,
            });
          }
        },
      }}
    />
  );
}

function MapToolbar() {
  const map = useMap();

  return (
    <div className="absolute right-5 top-1/2 z-[500] flex -translate-y-1/2 flex-col gap-3">
      <MapToolButton onClick={() => map.zoomIn()} icon={<Plus size={20} />} />
      <MapToolButton onClick={() => map.zoomOut()} icon={<Minus size={20} />} />
      <MapToolButton
        onClick={() => map.fitBounds(MADAGASCAR_BOUNDS)}
        icon={<Crosshair size={20} />}
      />
      <MapToolButton onClick={() => undefined} icon={<Layers size={20} />} />
      <MapToolButton onClick={() => undefined} icon={<Download size={20} />} />
      <MapToolButton onClick={() => undefined} icon={<Expand size={20} />} />
    </div>
  );
}

function MapToolButton({
  icon,
  onClick,
}: {
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-700 shadow-lg transition hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {icon}
    </button>
  );
}

function formatPopulation(value?: number) {
  if (!value || value <= 0) {
    return '—';
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return String(value);
}

function formatArea(value?: number) {
  if (!value || value <= 0) {
    return '—';
  }

  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateOnly(value?: string | null) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('fr-FR').format(new Date(value));
}

function formatTimeOnly(value?: string | null) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function WeatherItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-900">
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className="mt-1 font-extrabold text-slate-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}

function formatDateTime(value?: string) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
