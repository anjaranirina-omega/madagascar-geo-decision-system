import { useMemo } from 'react';
import { GeoJSON, LayerGroup, Marker, Popup } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import { ActiveCyclone } from '../services/cyclones.service';
import { AlertTriangle, Clock, Compass, Eye, ShieldAlert, Wind, Zap } from 'lucide-react';

interface ActiveCyclonesLayerProps {
  cyclones: ActiveCyclone[];
  visible: boolean;
}

function parseSeverityColor(severityLevel: string): {
  color: string;
  badgeBg: string;
  badgeText: string;
  pulseColor: string;
  label: string;
} {
  const sev = (severityLevel || '').toLowerCase();

  if (sev.includes('red') || sev.includes('critique') || sev.includes('rouge')) {
    return {
      color: '#ef4444',
      badgeBg: 'bg-red-500/20 border-red-500/40 text-red-600 dark:text-red-400',
      badgeText: 'Critique / Rouge',
      pulseColor: 'rgba(239, 68, 68, 0.45)',
      label: 'Niveau d’alerte Rouge (Impact majeur)',
    };
  }

  if (sev.includes('orange') || sev.includes('eleve') || sev.includes('élevé')) {
    return {
      color: '#f97316',
      badgeBg: 'bg-orange-500/20 border-orange-500/40 text-orange-600 dark:text-orange-400',
      badgeText: 'Élevé / Orange',
      pulseColor: 'rgba(249, 115, 22, 0.45)',
      label: 'Niveau d’alerte Orange (Menace potentielle)',
    };
  }

  return {
    color: '#10b981',
    badgeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
    badgeText: 'Modéré / Vert',
    pulseColor: 'rgba(16, 185, 129, 0.4)',
    label: 'Niveau d’alerte Vert (Sous surveillance)',
  };
}

function createCycloneDivIcon(severityLevel: string, name: string) {
  const { color, pulseColor } = parseSeverityColor(severityLevel);

  const html = `
    <div class="relative flex items-center justify-center cursor-pointer" style="width: 48px; height: 48px;">
      <span class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style="background-color: ${pulseColor};"></span>
      <div class="relative flex h-11 w-11 items-center justify-center rounded-full shadow-2xl border-2 border-white text-white font-black transition-transform duration-300 hover:scale-125" style="background: radial-gradient(circle at 30% 30%, #ffffff 0%, ${color} 35%, #0f172a 100%); box-shadow: 0 0 18px ${pulseColor};">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="animate-spin" style="animation-duration: 4s;">
          <path d="M12 2a10 10 0 0 0-7.07 17.07l1.41-1.41A8 8 0 0 1 12 4z"/>
          <path d="M12 22a10 10 0 0 0 7.07-17.07l-1.41 1.41A8 8 0 0 1 12 20z"/>
          <circle cx="12" cy="12" r="3.5" fill="currentColor"/>
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-cyclone-div-icon',
    html,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });
}

function formatDateSafe(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function ActiveCyclonesLayer({
  cyclones,
  visible,
}: ActiveCyclonesLayerProps) {
  if (!visible || !cyclones || cyclones.length === 0) {
    return null;
  }

  return (
    <LayerGroup>
      {cyclones.map((cyclone) => {
        const hasPosition =
          typeof cyclone.latitude === 'number' &&
          typeof cyclone.longitude === 'number';

        const position: LatLngExpression = hasPosition
          ? [cyclone.latitude!, cyclone.longitude!]
          : [0, 0];

        const sevInfo = parseSeverityColor(cyclone.severityLevel);
        const icon = createCycloneDivIcon(cyclone.severityLevel, cyclone.name);

        return (
          <LayerGroup key={cyclone.id}>
            {/* Trajectoire détaillée si disponible (Points & LineStrings) */}
            {cyclone.trackGeojson && cyclone.trackGeojson.features && (
              <GeoJSON
                key={`track-${cyclone.id}-${cyclone.fetchedAt}`}
                data={cyclone.trackGeojson as any}
                style={(feature) => {
                  const gtype = feature?.geometry?.type;
                  if (gtype === 'LineString' || gtype === 'MultiLineString') {
                    return {
                      color: '#a855f7', // Violet éclatant
                      weight: 3.5,
                      dashArray: '6, 8', // Pointillés distincts des limites administratives
                      opacity: 0.95,
                    };
                  }
                  return {
                    color: '#a855f7',
                    weight: 2,
                  };
                }}
                pointToLayer={(feature, latlng) => {
                  const props = feature.properties || {};
                  const isForecast = String(
                    props.Class || props.class || props.pointtype || props.type || '',
                  )
                    .toLowerCase()
                    .includes('forecast');

                  if (isForecast) {
                    return L.circleMarker(latlng, {
                      radius: 6.5,
                      fillColor: '#f43f5e', // Rose / Rouge prévisionnel
                      color: '#ffffff',
                      weight: 2,
                      opacity: 1,
                      fillOpacity: 0.9,
                    });
                  }

                  return L.circleMarker(latlng, {
                    radius: 5,
                    fillColor: '#3b82f6', // Bleu observation historique
                    color: '#ffffff',
                    weight: 1.5,
                    opacity: 1,
                    fillOpacity: 0.8,
                  });
                }}
                onEachFeature={(feature, layer) => {
                  const props = feature.properties || {};
                  const isForecast = String(
                    props.Class || props.class || props.pointtype || props.type || '',
                  )
                    .toLowerCase()
                    .includes('forecast');

                  const time = props.Time || props.time || props.fromdate || props.date;
                  const wind =
                    props.Wind || props.wind || props.windspeed || props.maxwind;

                  const popupContent = `
                    <div style="font-family: inherit; font-size: 12px; min-width: 170px; line-height: 1.4;">
                      <div style="font-weight: 800; color: ${isForecast ? '#e11d48' : '#2563eb'}; margin-bottom: 3px;">
                        ${isForecast ? '📍 Point prévisionnel (Forecast)' : '🔍 Point d’observation'}
                      </div>
                      ${time ? `<div><strong>Date :</strong> ${time}</div>` : ''}
                      ${wind ? `<div><strong>Vent :</strong> ${wind}</div>` : ''}
                    </div>
                  `;
                  layer.bindPopup(popupContent);
                }}
              />
            )}

            {/* Marqueur principal de position actuelle */}
            {hasPosition && (
              <Marker position={position} icon={icon} zIndexOffset={1000}>
                <Popup className="cyclone-leaflet-popup" minWidth={270} maxWidth={320}>
                  <div className="p-1 space-y-3 text-slate-800">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-white shadow"
                          style={{ backgroundColor: sevInfo.color }}
                        >
                          <Zap size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-black text-slate-950">
                            {cyclone.name}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-500">
                            ID GDACS: {cyclone.gdacsEventId}
                          </div>
                        </div>
                      </div>

                      <span
                        className={[
                          'rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider',
                          sevInfo.badgeBg,
                        ].join(' ')}
                      >
                        {sevInfo.badgeText}
                      </span>
                    </div>

                    {/* Données clés */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                        <div className="flex items-center gap-1 font-bold text-slate-500 text-[11px]">
                          <Wind size={13} className="text-blue-500" />
                          <span>Vents max</span>
                        </div>
                        <div className="mt-0.5 text-xs font-black text-slate-900">
                          {cyclone.windSpeed ?? 'Non spécifiée'}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                        <div className="flex items-center gap-1 font-bold text-slate-500 text-[11px]">
                          <Compass size={13} className="text-purple-500" />
                          <span>Zone / Pays</span>
                        </div>
                        <div className="mt-0.5 text-xs font-black text-slate-900 truncate">
                          {cyclone.country ?? 'Zone SWIO'}
                        </div>
                      </div>
                    </div>

                    {/* Position & Horodatages */}
                    <div className="space-y-1 text-[11px] text-slate-600">
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-500">Coordonnées :</span>
                        <span className="font-mono font-bold">
                          {cyclone.latitude?.toFixed(2)}°, {cyclone.longitude?.toFixed(2)}°
                        </span>
                      </div>

                      {cyclone.fromDate && (
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-500">Début :</span>
                          <span>{formatDateSafe(cyclone.fromDate)}</span>
                        </div>
                      )}

                      <div className="flex justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> Synchronisé :
                        </span>
                        <span>{formatDateSafe(cyclone.fetchedAt)}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
          </LayerGroup>
        );
      })}
    </LayerGroup>
  );
}
