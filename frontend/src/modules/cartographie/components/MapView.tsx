import { Layers, Map as MapIcon } from 'lucide-react';
import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import RasterRiskLayer from './RasterRiskLayer';

export default function MapView() {
  const [showRiskRaster, setShowRiskRaster] = useState(true);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_1fr]">
      <aside className="card p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 text-white">
            <Layers size={24} />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900">Couches</h2>
            <p className="text-sm text-slate-500">Analyse raster des risques</p>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50">
          <input
            type="checkbox"
            checked={showRiskRaster}
            onChange={(event) => setShowRiskRaster(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
          />
          <span className="font-semibold text-slate-700">
            Indice de risque raster
          </span>
        </label>

        <div className="mt-6 rounded-2xl border border-slate-200 p-4">
          <h3 className="mb-4 font-extrabold text-slate-900">
            Légende du risque
          </h3>

          <LegendItem color="#2f9e44" label="Faible" range="0–30" />
          <LegendItem color="#eab308" label="Moyen" range="31–60" />
          <LegendItem color="#f97316" label="Élevé" range="61–80" />
          <LegendItem color="#dc2626" label="Critique" range="81–100" />
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          <div className="mb-2 flex items-center gap-2 font-bold text-slate-800">
            <MapIcon size={18} />
            Couche affichée
          </div>
          Le raster affiché provient du pipeline ETL :
          <br />
          <strong>risk_index.tif</strong>
        </div>
      </aside>

      <section className="card overflow-hidden">
        <MapContainer
          center={[-18.8792, 47.5079]}
          zoom={6}
          style={{ height: 'calc(100vh - 150px)', width: '100%' }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <RasterRiskLayer visible={showRiskRaster} />

          <Marker position={[-18.8792, 47.5079]}>
            <Popup>Antananarivo — point de référence</Popup>
          </Marker>
        </MapContainer>
      </section>
    </div>
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
        <span className="font-semibold text-slate-700">{label}</span>
      </div>
      <span className="text-slate-500">{range}</span>
    </div>
  );
}
