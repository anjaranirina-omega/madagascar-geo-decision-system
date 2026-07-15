import {
  CheckCircle2,
  Clock,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  AccountRequest,
  AccountRequestStatus,
  accountRequestService,
} from '../../auth/account-request.service';

const statusLabels: Record<AccountRequestStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvée',
  REJECTED: 'Rejetée',
};

const statusClasses: Record<AccountRequestStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  APPROVED: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
};

const statusIcons: Record<AccountRequestStatus, typeof Clock> = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
};

const roleLabels: Record<string, string> = {
  DECIDEUR: 'Décideur',
  ANALYSTE: 'Analyste',
  AGENT_TERRAIN: 'Agent de terrain',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function AccountRequestsPage() {
  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccountRequestStatus | 'ALL'>(
    'ALL',
  );

  const loadRequests = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await accountRequestService.findAll();
      setRequests(data);
    } catch {
      setError(
        'Impossible de charger les demandes. Vérifiez que vous êtes connecté avec un compte administrateur.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesStatus =
        statusFilter === 'ALL' || request.status === statusFilter;

      const matchesQuery =
        !normalizedQuery ||
        request.fullName.toLowerCase().includes(normalizedQuery) ||
        request.email.toLowerCase().includes(normalizedQuery) ||
        request.organization.toLowerCase().includes(normalizedQuery) ||
        request.position.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [requests, query, statusFilter]);

  const counters = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((item) => item.status === 'PENDING').length,
      approved: requests.filter((item) => item.status === 'APPROVED').length,
      rejected: requests.filter((item) => item.status === 'REJECTED').length,
    };
  }, [requests]);

  const handleApprove = async (request: AccountRequest) => {
    const confirmed = window.confirm(
      `Approuver la demande de ${request.fullName} et créer son compte utilisateur ?`,
    );

    if (!confirmed) return;

    setActionLoadingId(request.id);
    setError('');
    setSuccess('');

    try {
      await accountRequestService.approve(request.id);
      setSuccess(
        `La demande de ${request.fullName} a été approuvée. Un email a été envoyé au demandeur.`,
      );
      await loadRequests();
    } catch {
      setError(
        'Impossible d’approuver cette demande. Vérifiez que l’utilisateur n’existe pas déjà.',
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (request: AccountRequest) => {
    const reason = window.prompt(
      `Motif du rejet pour ${request.fullName} :`,
      'Demande incomplète ou rôle non justifié.',
    );

    if (reason === null) return;

    setActionLoadingId(request.id);
    setError('');
    setSuccess('');

    try {
      await accountRequestService.reject(request.id, {
        reason,
      });
      setSuccess(
        `La demande de ${request.fullName} a été rejetée. Un email a été envoyé au demandeur.`,
      );
      await loadRequests();
    } catch {
      setError('Impossible de rejeter cette demande.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 text-white">
              <ShieldCheck size={30} />
            </div>

            <h2 className="text-2xl font-black text-slate-900">
              Demandes de compte
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Consultez les demandes envoyées depuis la page publique et validez
              l’accès des utilisateurs autorisés à la plateforme RISKCLIM-MG.
            </p>
          </div>

          <button
            onClick={loadRequests}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <CounterCard label="Total" value={counters.total} color="slate" />
        <CounterCard label="En attente" value={counters.pending} color="yellow" />
        <CounterCard label="Approuvées" value={counters.approved} color="green" />
        <CounterCard label="Rejetées" value={counters.rejected} color="red" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex h-12 flex-1 items-center rounded-xl border border-slate-300 px-4 focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-100">
            <Search size={20} className="mr-3 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher par nom, email, institution..."
              className="h-full w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as AccountRequestStatus | 'ALL')
            }
            className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="PENDING">En attente</option>
            <option value="APPROVED">Approuvées</option>
            <option value="REJECTED">Rejetées</option>
          </select>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            {success}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
        {loading ? (
          <div className="flex h-72 items-center justify-center text-slate-500">
            <RefreshCw className="mr-3 animate-spin" size={22} />
            Chargement des demandes...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center text-center">
            <Mail size={42} className="mb-3 text-slate-300" />
            <p className="font-bold text-slate-700">Aucune demande trouvée</p>
            <p className="mt-1 text-sm text-slate-500">
              Les demandes envoyées depuis la page contact apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Demandeur</th>
                  <th className="px-5 py-4">Institution</th>
                  <th className="px-5 py-4">Rôle</th>
                  <th className="px-5 py-4">Statut</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-t border-slate-100 align-top transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-5">
                      <div className="font-extrabold text-slate-900">
                        {request.fullName}
                      </div>
                      <div className="mt-1 text-slate-500">{request.email}</div>
                      {request.phone && (
                        <div className="mt-1 text-xs text-slate-400">
                          {request.phone}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-5">
                      <div className="font-semibold text-slate-800">
                        {request.organization}
                      </div>
                      <div className="mt-1 text-slate-500">
                        {request.position}
                      </div>
                    </td>

                    <td className="px-5 py-5">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        {roleLabels[request.requestedRole] ??
                          request.requestedRole}
                      </span>
                    </td>

                    <td className="px-5 py-5">
                      <StatusBadge status={request.status} />
                    </td>

                    <td className="px-5 py-5 text-slate-500">
                      {formatDate(request.createdAt)}
                    </td>

                    <td className="px-5 py-5">
                      <div className="flex justify-end gap-2">
                        {request.status === 'PENDING' ? (
                          <>
                            <button
                              onClick={() => handleApprove(request)}
                              disabled={actionLoadingId === request.id}
                              className="inline-flex h-10 items-center gap-2 rounded-xl bg-green-600 px-3 text-xs font-extrabold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <UserCheck size={16} />
                              Approuver
                            </button>

                            <button
                              onClick={() => handleReject(request)}
                              disabled={actionLoadingId === request.id}
                              className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-3 text-xs font-extrabold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <UserX size={16} />
                              Rejeter
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">
                            Traitée
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CounterCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'slate' | 'yellow' | 'green' | 'red';
}) {
  const colorClasses = {
    slate: 'bg-slate-50 text-slate-800',
    yellow: 'bg-yellow-50 text-yellow-800',
    green: 'bg-green-50 text-green-800',
    red: 'bg-red-50 text-red-800',
  };

  return (
    <div className={`rounded-2xl border border-slate-200 p-5 ${colorClasses[color]}`}>
      <div className="text-sm font-bold">{label}</div>
      <div className="mt-2 text-3xl font-black">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: AccountRequestStatus }) {
  const Icon = statusIcons[status];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-extrabold ${statusClasses[status]}`}
    >
      <Icon size={14} />
      {statusLabels[status]}
    </span>
  );
}
