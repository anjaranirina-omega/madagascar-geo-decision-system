import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  ShieldAlert,
  Users,
  Wind,
  X,
  XCircle,
  Zap,
  Droplets,
  Waves,
  Mountain,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet';
import {
  Alerte,
  AlerteNiveau,
  AlerteStatus,
  AlerteType,
} from '../alertes.service';
import {
  BoundaryLevel,
  geographieFrontendService,
} from '../../cartographie/services/geographie.service';

interface AlerteDetailDrawerProps {
  alerte: Alerte | null;
  onClose: () => void;
  onResolve: (alerte: Alerte) => Promise<void>;
  onIgnore: (alerte: Alerte) => Promise<void>;
  actionLoading: boolean;
}

const niveauLabels: Record<AlerteNiveau, string> = {
  FAIBLE: 'Faible',
  MOYEN: 'Moyen',
  ELEVE: 'Élevé',
  CRITIQUE: 'Critique',
};

const niveauClasses: Record<AlerteNiveau, string> = {
  FAIBLE:
    'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-200 dark:border-green-900',
  MOYEN:
    'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-200 dark:border-yellow-900',
  ELEVE:
    'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-900',
  CRITIQUE:
    'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900',
};

const typeLabels: Record<string, string> = {
  RISQUE_GLOBAL: 'Risque global',
  INONDATION: 'Inondation',
  CYCLONE: 'Cyclone',
  SECHERESSE: 'Sécheresse',
  GLISSEMENT_TERRAIN: 'Glissement de terrain',
  VENT_VIOLENT: 'Vent violent',
};

const typeIcons: Record<string, typeof ShieldAlert> = {
  RISQUE_GLOBAL: ShieldAlert,
  INONDATION: Waves,
  CYCLONE: Zap,
  SECHERESSE: Droplets,
  GLISSEMENT_TERRAIN: Mountain,
  VENT_VIOLENT: Wind,
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Indian/Antananarivo',
    }).format(new Date(value));
  } catch {
    return value;
  }
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

  return String(Math.round(value));
}

function getOperationalRecommendations(type: string, niveau: AlerteNiveau) {
  const isCritical = niveau === 'CRITIQUE';

  switch (type) {
    case 'INONDATION':
      return [
        'Vérifier les niveaux des cours d’eau et la saturation des sols.',
        'Alerter les comités locaux de secours et les communes en zone basse.',
        isCritical
          ? 'Préparer les zones d’évacuation et mobiliser les moyens de pompage.'
          : 'Maintenir une surveillance renforcée des bulletins hydrologiques.',
      ];
    case 'CYCLONE':
      return [
        'Consulter les trajectoires prévisionnelles et les bulletins d’alerte cyclonique.',
        'Sensibiliser la population à la consolidation des toitures et abris.',
        isCritical
          ? 'Déclencher la pré-alerte rouge et interdire les sorties en mer.'
          : 'Vérifier la disponibilité des stocks d’urgence et des abris sûrs.',
      ];
    case 'SECHERESSE':
      return [
        'Évaluer les réserves en eau des bassins versants et barrages hydroagricoles.',
        'Mettre en place des mesures de gestion économe de l’eau.',
        isCritical
          ? 'Organiser le ravitaillement d’urgence en eau potable pour les populations exposées.'
          : 'Suivre l’indice de végétation et l’état d’humidité des cultures.',
      ];
    case 'GLISSEMENT_TERRAIN':
      return [
        'Inspecter les zones de forte pente et les versants instables.',
        'Interdire l’accès aux zones à risque d’éboulement lors des fortes pluies.',
        isCritical
          ? 'Évacuer immédiatement les habitations situées en contrebas des falaises ou remblais.'
          : 'Informer les autorités locales avant tout épisode pluvieux significatif.',
      ];
    case 'VENT_VIOLENT':
      return [
        'Sécuriser les infrastructures légères, câbles et toitures.',
        'Limiter les déplacements non indispensables en zones exposées.',
        isCritical
          ? 'Fermer temporairement les établissements scolaires et marchés en plein air.'
          : 'Diffuser les consignes de sécurité à la radio locale.',
      ];
    default:
      return [
        'Maintenir une veille territoriale et croiser avec les signaux opérationnels.',
        'Vérifier l’état des routes et des accès logistiques principaux.',
        isCritical
          ? 'Convoquer la cellule de crise locale et préparer la coordination inter-agences.'
          : 'Assurer une mise à jour régulière des indicateurs de risque.',
      ];
  }
}

function MapAutoBounds({ feature }: { feature: any }) {
  const map = useMap();

  useEffect(() => {
    if (!feature) return;

    try {
      const geoJsonLayer = new (window as any).L.GeoJSON(feature);
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20], maxZoom: 10 });
      }
    } catch {
      // Ignore map fitting error
    }
  }, [feature, map]);

  return null;
}

function ZoneMiniMap({
  zoneType,
  zoneId,
  zoneNom,
}: {
  zoneType?: string;
  zoneId?: string;
  zoneNom?: string;
}) {
  const [feature, setFeature] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!zoneId || !zoneType) {
      setFeature(null);
      return;
    }

    let isMounted = true;
    const level: BoundaryLevel =
      zoneType === 'region'
        ? 'regions'
        : zoneType === 'district'
          ? 'districts'
          : 'communes';

    setLoading(true);
    geographieFrontendService
      .getFeature(level, zoneId)
      .then((data) => {
        if (isMounted) setFeature(data);
      })
      .catch((err) => {
        console.warn('[MiniMap] Feature fetch error:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [zoneType, zoneId]);

  const defaultCenter: [number, number] = [-18.8792, 47.5079];

  return (
    <div className="relative h-44 w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      <MapContainer
        center={defaultCenter}
        zoom={6}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {feature && (
          <>
            <GeoJSON
              key={feature.properties?.id ?? zoneId}
              data={feature}
              style={() => ({
                color: '#ef4444',
                weight: 3,
                fillColor: '#ef4444',
                fillOpacity: 0.25,
              })}
            />
            <MapAutoBounds feature={feature} />
          </>
        )}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-2 left-2 z-[400] rounded-lg bg-white/90 px-2 py-1 text-xs font-bold text-slate-800 shadow backdrop-blur dark:bg-slate-900/90 dark:text-slate-200">
        <MapPin size={12} className="mr-1 inline text-red-500" />
        {zoneNom ?? 'Madagascar'} ({zoneType ?? 'Zone'})
      </div>

      {loading && (
        <div className="absolute inset-0 z-[401] flex items-center justify-center bg-white/60 backdrop-blur-xs dark:bg-slate-950/60">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Chargement de la zone...
          </div>
        </div>
      )}
    </div>
  );
}

export default function AlerteDetailDrawer({
  alerte,
  onClose,
  onResolve,
  onIgnore,
  actionLoading,
}: AlerteDetailDrawerProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!alerte) return null;

  const TypeIcon = typeIcons[alerte.type] ?? ShieldAlert;
  const recommendations = getOperationalRecommendations(
    alerte.type,
    alerte.niveau,
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Drawer Panel */}
      <div className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 p-6 dark:border-slate-800">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-md">
              <TypeIcon size={24} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={[
                    'rounded-full border px-2.5 py-0.5 text-xs font-extrabold',
                    niveauClasses[alerte.niveau],
                  ].join(' ')}
                >
                  {niveauLabels[alerte.niveau]}
                </span>

                <span
                  className={[
                    'rounded-full border px-2.5 py-0.5 text-xs font-extrabold',
                    alerte.status === 'ACTIVE'
                      ? 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-200'
                      : alerte.status === 'RESOLUE'
                        ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200'
                        : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
                  ].join(' ')}
                >
                  {alerte.status === 'ACTIVE'
                    ? 'Active'
                    : alerte.status === 'RESOLUE'
                      ? 'Résolue'
                      : 'Ignorée'}
                </span>

                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {typeLabels[alerte.type] ?? alerte.type}
                </span>
              </div>

              <h3 className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                {alerte.titre}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Fermer le tiroir"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Message complet */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
            <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
              Message d’alerte
            </div>
            {alerte.message}
          </div>

          {/* Mini-Carte & Zone */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Localisation géographique</span>
              <span className="text-slate-600 dark:text-slate-300">
                {alerte.zoneType ?? 'Région'}
              </span>
            </div>

            <ZoneMiniMap
              zoneType={alerte.zoneType}
              zoneId={alerte.zoneId}
              zoneNom={alerte.zoneNom}
            />
          </div>

          {/* Indicateurs clés */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-950">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Score max
              </div>
              <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                {typeof alerte.riskValue === 'number'
                  ? alerte.riskValue.toFixed(1)
                  : '—'}
              </div>
              <div className="text-xs text-slate-400">sur 100</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-950">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Score moyen
              </div>
              <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                {typeof alerte.riskMean === 'number'
                  ? alerte.riskMean.toFixed(1)
                  : '—'}
              </div>
              <div className="text-xs text-slate-400">de la zone</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-950">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Population exp.
              </div>
              <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                {formatPopulation(alerte.populationExposed)}
              </div>
              <div className="text-xs text-slate-400">habitants</div>
            </div>
          </div>

          {/* Recommandations opérationnelles */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
            <div className="mb-2.5 flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
              <ShieldAlert size={18} className="text-blue-600 dark:text-blue-400" />
              Recommandations opérationnelles
            </div>

            <ul className="space-y-2 text-xs leading-5 text-blue-800 dark:text-blue-300">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Horodatages et traçabilité */}
          <div className="space-y-2.5 rounded-2xl border border-slate-200 p-4 text-xs dark:border-slate-800">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Traçabilité
            </div>

            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} /> Détectée le :
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-200">
                {formatDate(alerte.createdAt)}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock size={14} /> Dernière actualisation :
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-200">
                {formatDate(alerte.updatedAt)}
              </span>
            </div>

            {alerte.resolvedAt && (
              <div className="flex items-center justify-between text-green-700 dark:text-green-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Résolue le :
                </span>
                <span className="font-semibold">
                  {formatDate(alerte.resolvedAt)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 p-5 dark:border-slate-800">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Fermer
          </button>

          {alerte.status === 'ACTIVE' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onIgnore(alerte)}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                <XCircle size={16} />
                Ignorer
              </button>

              <button
                onClick={() => onResolve(alerte)}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                <CheckCircle2 size={16} />
                Résoudre l’alerte
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
