import {
  AlertTriangle,
  ChevronDown,
  Crosshair,
  Droplets,
  Layers,
  Map as MapIcon,
  Minus,
  Move,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Waves,
  Zap,
  Users,
  Clock,
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
import { rasterFrontendService, type RasterLayerMetadata } from '../services/rasters.service';
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
  | 'landslide';

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

function getRiskSourceDescription(activeRiskLayerType: string | null) {
  if (activeRiskLayerType === 'CYCLONE_RISK_INDEX') {
    return 'Modèle cyclone combinant l’aléa historique IBTrACS, les précipitations CHIRPS, l’occupation du sol et l’exposition de la population.';
  }

  if (activeRiskLayerType === 'LANDSLIDE_RISK_INDEX') {
    return 'Modèle glissement de terrain combinant la pente issue du DEM Copernicus, les précipitations CHIRPS, l’occupation du sol et l’exposition.';
  }

  if (activeRiskLayerType === 'DROUGHT_RISK_INDEX') {
    return 'Modèle sécheresse combinant le déficit pluviométrique, le stress thermique NASA POWER, l’occupation du sol et l’exposition.';
  }

  if (activeRiskLayerType === 'FLOOD_RISK_INDEX') {
    return 'Modèle inondation combinant les précipitations CHIRPS, la proximité HydroRIVERS, la pente et l’exposition.';
  }

  return 'Indice composite global calculé à partir des critères climatiques, physiques et socio-économiques disponibles.';
}

function getDecisionAdvice(level: string, hasValue: boolean) {
  if (!hasValue) {
    return {
      title: 'Lecture indisponible',
      message:
        'Aucune valeur raster exploitable n’est disponible pour ce point. Cela peut indiquer une zone hors emprise ou une valeur NoData.',
      tone: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300',
    };
  }

  if (level === 'Faible') {
    return {
      title: 'Surveillance standard',
      message:
        'Le score indique un niveau faible. La zone reste à suivre dans le cadre de la surveillance territoriale normale.',
      tone: 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-200',
    };
  }

  if (level === 'Moyen') {
    return {
      title: 'Zone à suivre',
      message:
        'Le score indique un niveau moyen. La zone mérite un suivi régulier, surtout si les conditions météo se dégradent.',
      tone: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-200',
    };
  }

  if (level === 'Élevé') {
    return {
      title: 'Surveillance prioritaire',
      message:
        'Le score indique un niveau élevé. Cette zone doit être priorisée pour l’analyse, la veille et la préparation opérationnelle.',
      tone: 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-200',
    };
  }

  return {
    title: 'Attention renforcée',
    message:
      'Le score indique un niveau critique. La zone nécessite une attention renforcée et une vérification avec les données opérationnelles disponibles.',
    tone: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200',
  };
}

function formatRasterGrid(georaster: any | null) {
  if (!georaster) return 'Raster non chargé';

  const width = Number(georaster.width);
  const height = Number(georaster.height);

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return 'Dimensions indisponibles';
  }

  return `${width.toLocaleString('fr-FR')} × ${height.toLocaleString('fr-FR')} pixels`;
}

function formatRasterResolution(georaster: any | null) {
  if (!georaster) return '—';

  const pixelWidth = Math.abs(Number(georaster.pixelWidth));
  const pixelHeight = Math.abs(Number(georaster.pixelHeight));

  if (!Number.isFinite(pixelWidth) || !Number.isFinite(pixelHeight)) {
    return 'Résolution indisponible';
  }

  return `${pixelWidth.toFixed(4)}° × ${pixelHeight.toFixed(4)}°`;
}

function formatRasterLayerDate(value?: string | null) {
  if (!value) return 'Date inconnue';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date inconnue';

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}


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
  const [availableRasterLayers, setAvailableRasterLayers] = useState<RasterLayerMetadata[]>([]);
  const [selectedRasterLayerId, setSelectedRasterLayerId] = useState('');
  const [rasterLayersLoading, setRasterLayersLoading] = useState(false);
  const [rasterLayersError, setRasterLayersError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedBoundaryFeature, setSelectedBoundaryFeature] = useState<any | null>(null);


  const markerLatLng = Array.isArray(markerPosition)
    ? {
        lat: markerPosition[0],
        lng: markerPosition[1],
      }
    : {
        lat: markerPosition.lat,
        lng: markerPosition.lng,
      };

  const activeRiskLayerType = riskLayers.cyclone
    ? 'CYCLONE_RISK_INDEX'
    : riskLayers.landslide
      ? 'LANDSLIDE_RISK_INDEX'
      : riskLayers.drought
        ? 'DROUGHT_RISK_INDEX'
        : riskLayers.flood
          ? 'FLOOD_RISK_INDEX'
          : riskLayers.global
            ? 'RISK_INDEX'
            : null;

  const activeRiskLayerLabel =
    activeRiskLayerType === 'CYCLONE_RISK_INDEX'
      ? 'Risque cyclone'
      : activeRiskLayerType === 'LANDSLIDE_RISK_INDEX'
        ? 'Risque glissement de terrain'
        : activeRiskLayerType === 'DROUGHT_RISK_INDEX'
          ? 'Risque sécheresse'
          : activeRiskLayerType === 'FLOOD_RISK_INDEX'
            ? 'Risque inondation'
            : 'Risque global';

  const showRiskRaster = activeRiskLayerType !== null;


  const selectedLevel = selectedRisk?.level ?? 'Moyen';

  const selectedValue =
    typeof selectedRisk?.value === 'number' ? selectedRisk.value : null;

  const hasSelectedRiskValue = selectedValue !== null;
  const riskSourceDescription = getRiskSourceDescription(activeRiskLayerType);
  const decisionAdvice = getDecisionAdvice(selectedLevel, hasSelectedRiskValue);
  const rasterGridSummary = formatRasterGrid(georaster);
  const rasterResolutionSummary = formatRasterResolution(georaster);
  const selectedRasterLayer = selectedRasterLayerId
    ? availableRasterLayers.find((layer) => layer.id === selectedRasterLayerId) ?? null
    : null;
  const selectedRasterLayerLabel = selectedRasterLayer
    ? formatRasterLayerDate(selectedRasterLayer.updatedAt ?? selectedRasterLayer.createdAt)
    : 'Dernière version disponible';
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

  useEffect(() => {
    let cancelled = false;

    const loadRasterVersions = async () => {
      setSelectedRasterLayerId('');
      setAvailableRasterLayers([]);
      setRasterLayersError('');

      if (!activeRiskLayerType) {
        return;
      }

      setRasterLayersLoading(true);

      try {
        const layers = await rasterFrontendService.findByType(activeRiskLayerType);

        if (!cancelled) {
          setAvailableRasterLayers(layers);
        }
      } catch (error) {
        console.error('[MapView] Impossible de charger les versions raster:', error);

        if (!cancelled) {
          setRasterLayersError('Versions indisponibles');
        }
      } finally {
        if (!cancelled) {
          setRasterLayersLoading(false);
        }
      }
    };

    loadRasterVersions();

    return () => {
      cancelled = true;
    };
  }, [activeRiskLayerType]);

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

    setRiskLayers((current) => {
      if (
        (key === 'global' ||
          key === 'flood' ||
          key === 'drought' ||
          key === 'landslide' ||
          key === 'cyclone') &&
        value
      ) {
        return {
          ...current,
          global: key === 'global',
          flood: key === 'flood',
          drought: key === 'drought',
          landslide: key === 'landslide',
          cyclone: key === 'cyclone',
        };
      }

      return {
        ...current,
        [key]: value,
      };
    });
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
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[330px_minmax(0,1fr)_350px]">
        <aside className="card order-2 max-h-[420px] overflow-y-auto p-4 sm:p-5 xl:order-1 xl:h-[calc(100vh-210px)] xl:max-h-none">
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
              subtitle="HydroRIVERS + CHIRPS + pente + exposition"
              icon={<Waves size={16} />}
            />

            <LayerCheckbox
              checked={riskLayers.cyclone}
              onChange={(value) => toggleRiskLayer('cyclone', value)}
              label="Risque cyclone"
              subtitle="IBTrACS + CHIRPS + occupation du sol + exposition"
              icon={<Zap size={16} />}
            />

            <LayerCheckbox
              checked={riskLayers.drought}
              onChange={(value) => toggleRiskLayer('drought', value)}
              label="Risque sécheresse"
              subtitle="NASA POWER + CHIRPS + occupation du sol + exposition"
              icon={<Droplets size={16} />}
            />

            <LayerCheckbox
              checked={riskLayers.landslide}
              onChange={(value) => toggleRiskLayer('landslide', value)}
              label="Risque glissement de terrain"
              subtitle="Pente Copernicus + CHIRPS + occupation du sol + exposition"
              icon={<AlertTriangle size={16} />}
            />

            <RasterVersionSelect
              activeRiskLayerLabel={activeRiskLayerLabel}
              layers={availableRasterLayers}
              loading={rasterLayersLoading}
              error={rasterLayersError}
              selectedRasterLayerId={selectedRasterLayerId}
              onChange={setSelectedRasterLayerId}
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

        <section className="card relative order-1 min-w-0 overflow-hidden xl:order-2">
          <MapContainer
            bounds={MADAGASCAR_BOUNDS}
            maxBounds={MADAGASCAR_MAX_BOUNDS}
            maxBoundsViscosity={0.85}
            minZoom={5}
            zoom={6}
            zoomControl={false}
            scrollWheelZoom
            className="h-[62vh] min-h-[420px] w-full xl:h-[calc(100vh-210px)]"
            style={{ width: '100%' }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {activeRiskLayerType && (
              <RasterRiskLayer
                key={`${activeRiskLayerType}-${selectedRasterLayerId || 'latest'}`}
                visible={showRiskRaster}
                rasterType={activeRiskLayerType}
                rasterLayerId={selectedRasterLayerId || undefined}
                onRasterLoaded={handleRasterLoaded}
              />
            )}

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

          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[500] rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:bottom-5 sm:left-1/2 sm:w-[78%] sm:-translate-x-1/2 sm:p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="font-extrabold text-slate-900 dark:text-white">
                  Niveau de risque
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Indice composite normalisé sur 100 selon le modèle actif.
                </div>
              </div>

              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {activeRiskLayerLabel}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
              <LegendItem color="#2f9e44" label="Faible" range="0–30" />
              <LegendItem color="#eab308" label="Moyen" range="31–60" />
              <LegendItem color="#f97316" label="Élevé" range="61–80" />
              <LegendItem color="#dc2626" label="Critique" range="81–100" />
            </div>
          </div>
        </section>

        <aside className="card order-3 max-h-[520px] overflow-y-auto p-4 sm:p-5 xl:col-span-2 xl:max-h-none 2xl:col-span-1 2xl:h-[calc(100vh-210px)]">
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
              {activeRiskLayerLabel} local
            </div>

            <div className="mt-3 flex items-end gap-2">
              <div className="text-5xl font-black">
                {hasSelectedRiskValue ? selectedValue.toFixed(0) : '—'}
              </div>
              <div className="mb-2 font-bold">/100</div>

              <span
                className={[
                  'mb-2 ml-auto rounded-full border px-3 py-1 text-xs font-extrabold',
                  riskBadgeClasses[selectedLevel],
                ].join(' ')}
              >
                {hasSelectedRiskValue ? selectedLevel : 'Non disponible'}
              </span>
            </div>

            <div className="mt-4 rounded-2xl bg-white/55 p-3 text-sm dark:bg-slate-950/35">
              <div className="font-extrabold">Lecture du modèle</div>
              <p className="mt-1 leading-6">
                {riskSourceDescription}
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl bg-white/55 p-3 dark:bg-slate-950/35">
                <div className="font-bold opacity-75">Latitude</div>
                <div className="mt-1 font-black">{markerLatLng.lat.toFixed(5)}</div>
              </div>

              <div className="rounded-2xl bg-white/55 p-3 dark:bg-slate-950/35">
                <div className="font-bold opacity-75">Longitude</div>
                <div className="mt-1 font-black">{markerLatLng.lng.toFixed(5)}</div>
              </div>
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

          <div
            className={[
              'mb-5 rounded-3xl border p-5',
              decisionAdvice.tone,
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <Shield size={22} />
              </div>

              <div>
                <div className="font-extrabold">
                  Lecture décisionnelle : {decisionAdvice.title}
                </div>
                <p className="mt-2 text-sm leading-6">
                  {decisionAdvice.message}
                </p>
                <p className="mt-3 text-xs font-semibold opacity-80">
                  Cette interprétation est une aide à la décision. Elle doit être
                  croisée avec les observations terrain, les bulletins officiels
                  et les procédures institutionnelles.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="mb-4 font-extrabold text-slate-900 dark:text-white">
              Couche raster active
            </div>

            <div className="space-y-3 text-sm">
              <DecisionMetaRow label="Risque affiché" value={activeRiskLayerLabel} />
              <DecisionMetaRow label="Version affichée" value={selectedRasterLayerLabel} />
              <DecisionMetaRow label="Type raster" value={activeRiskLayerType ?? 'Aucune couche active'} />
              <DecisionMetaRow label="Grille" value={rasterGridSummary} />
              <DecisionMetaRow label="Résolution" value={rasterResolutionSummary} />
              <DecisionMetaRow label="Système de coordonnées" value="EPSG:4326" />
            </div>
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
}: {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchOpen: boolean;
  setSearchOpen: (value: boolean) => void;
  searchResults: SearchResult[];
  onSelectSearchResult: (result: SearchResult) => void;
}) {
  return (
    <div className="card p-4">
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

function RasterVersionSelect({
  activeRiskLayerLabel,
  layers,
  loading,
  error,
  selectedRasterLayerId,
  onChange,
}: {
  activeRiskLayerLabel: string;
  layers: RasterLayerMetadata[];
  loading: boolean;
  error: string;
  selectedRasterLayerId: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="mb-1 text-sm font-extrabold text-slate-700 dark:text-slate-200">
        Version de la couche raster
      </div>

      <p className="mb-3 text-xs leading-5 text-slate-500">
        {activeRiskLayerLabel} — choix de la version affichée.
      </p>

      <select
        value={selectedRasterLayerId}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading || layers.length === 0}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
      >
        <option value="">
          {loading ? 'Chargement des versions...' : 'Dernière version disponible'}
        </option>

        {layers.map((layer) => (
          <option key={layer.id} value={layer.id}>
            {formatRasterLayerDate(layer.updatedAt ?? layer.createdAt)} — {layer.name}
          </option>
        ))}
      </select>

      {error ? (
        <div className="mt-2 text-xs font-bold text-red-600">{error}</div>
      ) : (
        <div className="mt-2 text-xs text-slate-500">
          {layers.length > 0
            ? `${layers.length} version(s) disponible(s)`
            : loading
              ? 'Recherche des versions...'
              : 'Aucune version enregistrée pour cette couche'}
        </div>
      )}
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

function DecisionMetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-2 last:border-b-0 last:pb-0 dark:border-slate-800">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="max-w-[58%] text-right font-extrabold text-slate-800 dark:text-slate-100">
        {value}
      </span>
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
    <div className="absolute right-4 top-4 z-[500] flex flex-col gap-3">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-800 shadow-lg transition hover:bg-slate-50"
        aria-label="Zoom avant"
      >
        <Plus size={20} />
      </button>

      <button
        type="button"
        onClick={() => map.zoomOut()}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-800 shadow-lg transition hover:bg-slate-50"
        aria-label="Zoom arrière"
      >
        <Minus size={20} />
      </button>
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
