export type AppRole = 'ADMIN' | 'ANALYSTE' | 'DECIDEUR' | 'AGENT_TERRAIN';

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: 'Administrateur',
  ANALYSTE: 'Analyste',
  DECIDEUR: 'Décideur',
  AGENT_TERRAIN: 'Agent de terrain',
};

export const PAGE_ACCESS = {
  dashboard: ['ADMIN', 'ANALYSTE', 'DECIDEUR'],
  carte: ['ADMIN', 'ANALYSTE', 'DECIDEUR', 'AGENT_TERRAIN'],
  analyse: ['ADMIN', 'ANALYSTE'],
  alertes: ['ADMIN', 'ANALYSTE', 'DECIDEUR', 'AGENT_TERRAIN'],
  donnees: ['ADMIN', 'ANALYSTE'],
  rapports: ['ADMIN', 'ANALYSTE', 'DECIDEUR'],
  parametres: ['ADMIN'],
  utilisateurs: ['ADMIN'],
  demandesComptes: ['ADMIN'],
  aide: ['ADMIN', 'ANALYSTE', 'DECIDEUR', 'AGENT_TERRAIN'],
} satisfies Record<string, AppRole[]>;

export function normalizeRole(roleName?: string | null): AppRole | undefined {
  if (
    roleName === 'ADMIN' ||
    roleName === 'ANALYSTE' ||
    roleName === 'DECIDEUR' ||
    roleName === 'AGENT_TERRAIN'
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
    case 'AGENT_TERRAIN':
      return '/carte';
    default:
      return '/login';
  }
}
