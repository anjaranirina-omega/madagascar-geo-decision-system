import {
  CheckCircle2,
  Edit,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Role,
  User,
  usersService,
} from '../users.service';

type UserFormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  avatarUrl: string;
  roleId: string;
  isActive: boolean;
};

const emptyForm: UserFormState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  avatarUrl: '',
  roleId: '',
  isActive: true,
};

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrateur',
  DECIDEUR: 'Décideur',
  ANALYSTE: 'Analyste',
  AGENT_TERRAIN: 'Agent de terrain',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [removeAvatarRequested, setRemoveAvatarRequested] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [usersData, rolesData] = await Promise.all([
        usersService.findAll(),
        usersService.findRoles(),
      ]);

      setUsers(usersData);
      setRoles(rolesData);
    } catch {
      setError(
        'Impossible de charger les utilisateurs. Vérifiez que vous êtes connecté en administrateur.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((user) => user.isActive).length,
      inactive: users.filter((user) => !user.isActive).length,
      admins: users.filter((user) => user.role?.name === 'ADMIN').length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();

      const matchesQuery =
        !normalizedQuery ||
        fullName.includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery) ||
        user.phone?.toLowerCase().includes(normalizedQuery) ||
        user.role?.name.toLowerCase().includes(normalizedQuery);

      const matchesRole =
        roleFilter === 'ALL' || user.role?.name === roleFilter;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && user.isActive) ||
        (statusFilter === 'INACTIVE' && !user.isActive);

      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [users, query, roleFilter, statusFilter]);

  const openCreateModal = () => {
    setEditingUser(null);
    setAvatarFile(null);
    setAvatarPreview('');
    setRemoveAvatarRequested(false);
    setForm({
      ...emptyForm,
      password: generateTemporaryPassword(),
      roleId: roles.find((role) => role.name === 'ANALYSTE')?.id ?? '',
    });
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setAvatarFile(null);
    setAvatarPreview(user.avatarUrl ?? '');
    setRemoveAvatarRequested(false);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      phone: user.phone ?? '',
      avatarUrl: user.avatarUrl ?? '',
      roleId: user.role?.id ?? '',
      isActive: user.isActive,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
    setAvatarFile(null);
    setAvatarPreview('');
    setRemoveAvatarRequested(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      if (editingUser) {
        const payload: any = {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || undefined,
          avatarUrl: form.avatarUrl || undefined,
          roleId: form.roleId || undefined,
          isActive: form.isActive,
        };

        if (form.password.trim()) {
          payload.password = form.password;
        }

        const updatedUser = await usersService.update(editingUser.id, payload);

        if (removeAvatarRequested && editingUser) {
          await usersService.removeAvatar(editingUser.id);
        }

        if (avatarFile && !removeAvatarRequested) {
          await usersService.uploadAvatar(updatedUser.id, avatarFile);
        }

        setSuccess('Utilisateur mis à jour avec succès.');
      } else {
        await usersService.create({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          avatarUrl: form.avatarUrl || undefined,
          roleId: form.roleId || undefined,
          isActive: form.isActive,
        });
        setSuccess('Utilisateur créé avec succès.');
      }

      closeModal();
      await loadData();
    } catch (error) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        (error as any).response?.data?.message
          ? Array.isArray((error as any).response.data.message)
            ? (error as any).response.data.message.join(' ')
            : (error as any).response.data.message
          : 'Impossible d’enregistrer l’utilisateur. Vérifiez les informations saisies.';

      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    const confirmed = window.confirm(
      user.isActive
        ? `Désactiver le compte de ${user.firstName} ${user.lastName} ?`
        : `Réactiver le compte de ${user.firstName} ${user.lastName} ?`,
    );

    if (!confirmed) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      await usersService.update(user.id, {
        isActive: !user.isActive,
      });

      setSuccess(
        user.isActive
          ? 'Utilisateur désactivé.'
          : 'Utilisateur réactivé.',
      );

      await loadData();
    } catch {
      setError('Impossible de modifier le statut de l’utilisateur.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (user: User) => {
    const confirmed = window.confirm(
      `Supprimer définitivement ${user.firstName} ${user.lastName} ? Cette action est irréversible.`,
    );

    if (!confirmed) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      await usersService.remove(user.id);
      setSuccess('Utilisateur supprimé.');
      await loadData();
    } catch {
      setError(
        'Impossible de supprimer cet utilisateur. Il est peut-être lié à des données existantes.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 text-white">
              <UserCog size={30} />
            </div>

            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Gestion des utilisateurs
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Gérez les comptes, rôles et statuts des utilisateurs autorisés à
              accéder à la plateforme RISKCLIM-MG.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>

            <button
              onClick={openCreateModal}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 px-4 text-sm font-extrabold text-white shadow-lg shadow-blue-900/10 transition hover:scale-[1.01]"
            >
              <Plus size={18} />
              Nouvel utilisateur
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Total" value={stats.total} tone="slate" />
        <StatCard label="Actifs" value={stats.active} tone="green" />
        <StatCard label="Inactifs" value={stats.inactive} tone="red" />
        <StatCard label="Admins" value={stats.admins} tone="blue" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex h-12 flex-1 items-center rounded-xl border border-slate-300 px-4 focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-100 dark:border-slate-700 dark:bg-slate-950">
            <Search size={20} className="mr-3 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher par nom, email, téléphone ou rôle..."
              className="h-full w-full bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="ALL">Tous les rôles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.name}>
                  {roleLabels[role.name] ?? role.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="ACTIVE">Actifs</option>
              <option value="INACTIVE">Inactifs</option>
            </select>
          </div>
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

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="flex h-72 items-center justify-center text-slate-500">
            <RefreshCw className="mr-3 animate-spin" size={22} />
            Chargement des utilisateurs...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center text-center">
            <UserCog size={42} className="mb-3 text-slate-300" />
            <p className="font-bold text-slate-700 dark:text-slate-200">
              Aucun utilisateur trouvé
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Les comptes créés apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-4">Utilisateur</th>
                  <th className="px-5 py-4">Contact</th>
                  <th className="px-5 py-4">Rôle</th>
                  <th className="px-5 py-4">Statut</th>
                  <th className="px-5 py-4">Création</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-t border-slate-100 align-top transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                  >
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} />

                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            ID : {user.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-5">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {user.email}
                      </div>
                      <div className="mt-1 text-slate-500">
                        {user.phone || 'Téléphone non renseigné'}
                      </div>
                    </td>

                    <td className="px-5 py-5">
                      <RoleBadge role={user.role?.name} />
                    </td>

                    <td className="px-5 py-5">
                      <StatusBadge active={user.isActive} />
                    </td>

                    <td className="px-5 py-5 text-slate-500">
                      {formatDate(user.createdAt)}
                    </td>

                    <td className="px-5 py-5">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          disabled={actionLoading}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Edit size={15} />
                          Modifier
                        </button>

                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={actionLoading}
                          className={[
                            'inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-extrabold text-white transition disabled:opacity-60',
                            user.isActive
                              ? 'bg-orange-500 hover:bg-orange-600'
                              : 'bg-green-600 hover:bg-green-700',
                          ].join(' ')}
                        >
                          {user.isActive ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                          {user.isActive ? 'Désactiver' : 'Réactiver'}
                        </button>

                        <button
                          onClick={() => handleDelete(user)}
                          disabled={actionLoading}
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-3 text-xs font-extrabold text-white transition hover:bg-red-700 disabled:opacity-60"
                        >
                          <Trash2 size={15} />
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <UserModal
          editingUser={editingUser}
          form={form}
          setForm={setForm}
          roles={roles}
          avatarPreview={avatarPreview}
          setAvatarFile={setAvatarFile}
          setAvatarPreview={setAvatarPreview}
          removeAvatarRequested={removeAvatarRequested}
          setRemoveAvatarRequested={setRemoveAvatarRequested}
          actionLoading={actionLoading}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

function UserModal({
  editingUser,
  form,
  setForm,
  roles,
  avatarPreview,
  setAvatarFile,
  setAvatarPreview,
  removeAvatarRequested,
  setRemoveAvatarRequested,
  actionLoading,
  onClose,
  onSubmit,
}: {
  editingUser: User | null;
  form: UserFormState;
  setForm: React.Dispatch<React.SetStateAction<UserFormState>>;
  roles: Role[];
  avatarPreview: string;
  setAvatarFile: React.Dispatch<React.SetStateAction<File | null>>;
  setAvatarPreview: React.Dispatch<React.SetStateAction<string>>;
  removeAvatarRequested: boolean;
  setRemoveAvatarRequested: React.Dispatch<React.SetStateAction<boolean>>;
  actionLoading: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 text-white">
              {editingUser ? <Edit size={25} /> : <UserPlus size={25} />}
            </div>

            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {editingUser ? 'Modifier utilisateur' : 'Nouvel utilisateur'}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {editingUser
                ? 'Mettez à jour les informations du compte.'
                : 'Créez un compte utilisateur avec un rôle défini.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="mb-6 flex items-center gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Aperçu avatar"
              className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-blue-600 text-xl font-black uppercase text-white">
              {(form.firstName?.[0] ?? 'U') + (form.lastName?.[0] ?? '')}
            </div>
          )}

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center rounded-xl bg-gradient-to-r from-green-500 to-blue-600 px-4 py-2 text-sm font-extrabold text-white shadow-lg shadow-blue-900/10 transition hover:scale-[1.01]">
                Choisir une photo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (!file) {
                      return;
                    }

                    setAvatarFile(file);
                    setAvatarPreview(URL.createObjectURL(file));
                    setRemoveAvatarRequested(false);
                  }}
                />
              </label>

              {avatarPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setAvatarFile(null);
                    setAvatarPreview('');
                    setRemoveAvatarRequested(true);
                  }}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-extrabold text-red-700 transition hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900"
                >
                  Supprimer la photo
                </button>
              )}
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Formats acceptés : JPG, PNG, WEBP. Taille maximale : 5 Mo.
            </p>

            {removeAvatarRequested && (
              <p className="mt-2 text-xs font-semibold text-red-500">
                La photo sera supprimée après l’enregistrement.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            label="Prénom"
            value={form.firstName}
            onChange={(value) => setForm((prev) => ({ ...prev, firstName: value }))}
            required
          />

          <InputField
            label="Nom"
            value={form.lastName}
            onChange={(value) => setForm((prev) => ({ ...prev, lastName: value }))}
            required
          />

          <InputField
            label="Email"
            type="email"
            value={form.email}
            onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
            required
          />

          <InputField
            label="Téléphone"
            value={form.phone}
            onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
          />

          <div>
            <label className="mb-2 block font-bold text-slate-800 dark:text-slate-200">
              Rôle
            </label>
            <select
              value={form.roleId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, roleId: event.target.value }))
              }
              required
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="">Sélectionner un rôle</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {roleLabels[role.name] ?? role.name}
                </option>
              ))}
            </select>
          </div>

          <InputField
            label={
              editingUser
                ? 'Nouveau mot de passe optionnel'
                : 'Mot de passe temporaire'
            }
            type="text"
            value={form.password}
            onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
            required={!editingUser}
          />
        </div>

        <label className="mt-5 flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, isActive: event.target.checked }))
            }
            className="h-5 w-5 rounded border-slate-300 text-green-600 focus:ring-green-500"
          />
          Compte actif
        </label>

        <div className="mt-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={actionLoading}
            className="h-12 rounded-xl border border-slate-300 px-5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Annuler
          </button>

          <button
            type="submit"
            disabled={actionLoading}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 px-5 font-extrabold text-white shadow-lg shadow-blue-900/10 transition hover:scale-[1.01] disabled:opacity-60"
          >
            <LockKeyhole size={18} />
            {actionLoading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}


function InputField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block font-bold text-slate-800 dark:text-slate-200">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'slate' | 'green' | 'red' | 'blue';
}) {
  const classes = {
    slate: 'bg-slate-50 text-slate-800 dark:bg-slate-800 dark:text-slate-100',
    green: 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200',
    red: 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200',
    blue: 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  };

  return (
    <div className={`rounded-2xl border border-slate-200 p-5 dark:border-slate-800 ${classes[tone]}`}>
      <div className="text-sm font-bold">{label}</div>
      <div className="mt-2 text-3xl font-black">{value}</div>
    </div>
  );
}

function RoleBadge({ role }: { role?: string }) {
  return (
    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
      {role ? roleLabels[role] ?? role : 'Aucun rôle'}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-extrabold text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
      <CheckCircle2 size={14} />
      Actif
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-extrabold text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
      <XCircle size={14} />
      Inactif
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function generateTemporaryPassword() {
  return `Risk-${Math.random().toString(16).slice(2, 10)}-MG`;
}

function UserAvatar({ user }: { user: User }) {
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`
    .toUpperCase()
    .trim();

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={`${user.firstName} ${user.lastName}`}
        className="h-12 w-12 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700"
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-blue-600 text-sm font-black text-white">
      {initials || 'U'}
    </div>
  );
}
