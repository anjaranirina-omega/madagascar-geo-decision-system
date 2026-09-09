import React, { useState } from 'react';
import {
  MapPin,
  Send,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  FileText,
} from 'lucide-react';
import { CreateInterventionPayload, InterventionType, InterventionStatus, terrainService } from '../services/terrain.service';

interface FieldReportFormProps {
  onCreated?: () => void;
}

export default function FieldReportForm({ onCreated }: FieldReportFormProps) {
  const [type, setType] = useState<InterventionType>('EVALUATION');
  const [statut, setStatut] = useState<InterventionStatus>('PLANIFIEE');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setFeedback({
        type: 'error',
        message: 'La géolocalisation GPS n’est pas supportée par votre navigateur.',
      });
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLocating(false);
        setFeedback({
          type: 'success',
          message: `Position GPS acquise avec succès (±${Math.round(position.coords.accuracy)}m).`,
        });
      },
      (err) => {
        console.error('Erreur GPS:', err);
        setLocating(false);
        setFeedback({
          type: 'error',
          message: 'Impossible de récupérer la position GPS. Saisie manuelle possible.',
        });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const payload: CreateInterventionPayload = {
        type,
        statut,
        description: description.trim() || undefined,
        dateIntervention: new Date().toISOString(),
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
      };

      await terrainService.createIntervention(payload);

      setFeedback({
        type: 'success',
        message: 'Intervention terrain enregistrée avec succès.',
      });
      setDescription('');
      if (onCreated) {
        onCreated();
      }
    } catch (err: any) {
      console.error('Erreur création intervention:', err);
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Échec de l’enregistrement de l’intervention.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {feedback && (
        <div
          className={[
            'flex items-center gap-2 rounded-2xl p-4 text-xs font-bold transition-all',
            feedback.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-950/40 dark:border-green-900 dark:text-green-300'
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300',
          ].join(' ')}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={16} className="shrink-0" />
          ) : (
            <AlertCircle size={16} className="shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">
            Type d'intervention
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as InterventionType)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-purple-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="EVALUATION">Évaluation des dégâts & besoins</option>
            <option value="SECOURS">Opération de secours d'urgence</option>
            <option value="EVACUATION">Évacuation préventive / forcée</option>
            <option value="DISTRIBUTION">Distribution de vivres & kits</option>
            <option value="REHABILITATION">Réhabilitation d'urgence</option>
            <option value="AUTRE">Autre mission de terrain</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">
            Statut initial
          </label>
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value as InterventionStatus)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-purple-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="PLANIFIEE">Planifiée (À faire)</option>
            <option value="EN_COURS">En cours sur le terrain</option>
            <option value="TERMINEE">Terminée (Clôturée)</option>
            <option value="ANNULEE">Annulée</option>
          </select>
        </div>
      </div>

      {/* Coordonnées géographiques */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <MapPin size={15} className="text-purple-600" />
            <span>Coordonnées GPS du site</span>
          </div>
          <button
            type="button"
            onClick={handleGeolocate}
            disabled={locating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-100 px-3 py-1.5 text-xs font-black text-purple-700 hover:bg-purple-200 dark:bg-purple-950/60 dark:text-purple-300"
          >
            <Navigation size={13} className={locating ? 'animate-spin' : ''} />
            <span>{locating ? 'Acquisition...' : 'Localiser (GPS)'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[10px] font-bold text-slate-400">Latitude</span>
            <input
              type="number"
              step="any"
              placeholder="-18.8792"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400">Longitude</span>
            <input
              type="number"
              step="any"
              placeholder="47.5079"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Description / Constat terrain */}
      <div>
        <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">
          Constat & rapport d'observation
        </label>
        <textarea
          rows={3}
          placeholder="Décrivez la situation observée sur place, les infrastructures endommagées, l'état des routes, les besoins prioritaires..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-800 outline-none focus:border-purple-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-xs font-black text-white shadow-md shadow-purple-950/20 hover:opacity-95 disabled:opacity-50"
      >
        <Send size={15} className={submitting ? 'animate-spin' : ''} />
        <span>{submitting ? 'Envoi en cours...' : 'Transmettre le rapport terrain'}</span>
      </button>
    </form>
  );
}
