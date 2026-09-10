export type AppRole = 'ADMIN' | 'ANALYSTE' | 'DECIDEUR';

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: 'Administrateur',
  ANALYSTE: 'Analyste',
  DECIDEUR: 'Décideur',
};

export const PAGE_ACCESS = {
  dashboard: ['ADMIN', 'ANALYSTE', 'DECIDEUR'],
  carte: ['ADMIN', 'ANALYSTE', 'DECIDEUR'],
  analyse: ['ADMIN', 'ANALYSTE'],
  alertes: ['ADMIN', 'ANALYSTE', 'DECIDEUR'],
  donnees: ['ADMIN', 'ANALYSTE'],
  rapports: ['ADMIN', 'ANALYSTE', 'DECIDEUR'],
  parametres: ['ADMIN'],
  utilisateurs: ['ADMIN'],
  demandesComptes: ['ADMIN'],
  aide: ['ADMIN', 'ANALYSTE', 'DECIDEUR'],
} satisfies Record<string, AppRole[]>;

export function normalizeRole(roleName?: string | null): AppRole | undefined {
  if (
    roleName === 'ADMIN' ||
    roleName === 'ANALYSTE' ||
    roleName === 'DECIDEUR'
  ) {
    return roleName;
  }

  return undefined;
}

export function canAccessRole(roleName: string | undefined | null, allowedRoles: AppRole[]) {
  const role = normalizeRole(roleName);

  if (!role) {
    return false;
  }

  return allowedRoles.includes(role);
}

export function getDefaultPathForRole(roleName?: string | null) {
  const role = normalizeRole(roleName);

  switch (role) {
    case 'ADMIN':
    case 'ANALYSTE':
    case 'DECIDEUR':
      return '/dashboard';
    default:
      return '/login';
  }
}
