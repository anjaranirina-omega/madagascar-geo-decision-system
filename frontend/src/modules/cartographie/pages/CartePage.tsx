import { Map as MapIcon } from 'lucide-react';
import PageHeader from '../../../shared/components/ui/PageHeader';
import MapView from '../components/MapView';

export default function CartePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Système d'Information Géographique & Carte des Risques"
        subtitle="Visualisation spatiale interactive des couches rasters d'aléa, zonages administratifs (22 Régions, 119 Districts, 1579 Communes) et météo en temps réel."
        icon={<MapIcon size={32} className="text-emerald-400" />}
      />
      <MapView />
    </div>
  );
}
