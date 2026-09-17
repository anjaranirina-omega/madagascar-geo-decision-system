const PRODUCTION = 'production';

export const DEVELOPMENT_JWT_SECRET =
  'dev-only-insecure-jwt-secret-not-for-production-change-me';

const DEFAULT_MIN_SECRET_LENGTH = 16;
const JWT_MIN_SECRET_LENGTH = 32;
const ETL_API_KEY_MIN_LENGTH = 32;

const FORBIDDEN_SECRET_VALUES = new Set([
  'admin',
  'changeme',
  'change-me',
  'change_me',
  'change-me-in-production',
  'change_me_super_secret',
  'changeme_generate_a_random_32_bytes_hex_key',
  'default',
  'example',
  'geodecisionnel',
  'minioadmin',
  'minioadmin123',
  'password',
  'postgres',
  'secret',
  'supersecret',
  'test',
]);

const FORBIDDEN_SECRET_PREFIXES = [
  'replace_me',
  'replace-me',
  'change_me',
  'change-me',
  'changeme',
  'to_change',
  'your-',
  'your_',
];

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalized(value: string): string {
  return value.trim().toLowerCase();
}

function looksLikePlaceholder(value: string): boolean {
  const current = normalized(value);

  if (!current) {
    return true;
  }

  if (FORBIDDEN_SECRET_VALUES.has(current)) {
    return true;
  }

  return FORBIDDEN_SECRET_PREFIXES.some((prefix) => current.startsWith(prefix));
}

function secretIssue(
  config: Record<string, unknown>,
  variableName: string,
  minLength = DEFAULT_MIN_SECRET_LENGTH,
): string | null {
  const value = stringValue(config[variableName]);

  if (!value) {
    return `${variableName} doit être défini.`;
  }

  if (looksLikePlaceholder(value)) {
    return `${variableName} ne doit pas conserver une valeur d'exemple ou un placeholder.`;
  }

  if (value.length < minLength) {
    return `${variableName} doit contenir au moins ${minLength} caractères.`;
  }

  return null;
}

function optionalSecretIssue(
  config: Record<string, unknown>,
  variableName: string,
  minLength = DEFAULT_MIN_SECRET_LENGTH,
): string | null {
  const value = stringValue(config[variableName]);

  if (!value) {
    return null;
  }

  return secretIssue(config, variableName, minLength);
}

function effectiveStorageSecretIssue(config: Record<string, unknown>): string | null {
  const s3SecretKey = stringValue(config.S3_SECRET_KEY);
  const minioRootPassword = stringValue(config.MINIO_ROOT_PASSWORD);
  const effectiveSecret = s3SecretKey || minioRootPassword;

  if (!effectiveSecret) {
    return 'S3_SECRET_KEY ou MINIO_ROOT_PASSWORD doit être défini pour le stockage objet.';
  }

  if (looksLikePlaceholder(effectiveSecret)) {
    return 'Le secret de stockage objet ne doit pas conserver une valeur d\'exemple ou un placeholder.';
  }

  if (effectiveSecret.length < DEFAULT_MIN_SECRET_LENGTH) {
    return `Le secret de stockage objet doit contenir au moins ${DEFAULT_MIN_SECRET_LENGTH} caractères.`;
  }

  return null;
}

function databaseUrlIssue(config: Record<string, unknown>): string | null {
  const databaseUrl = stringValue(config.DATABASE_URL);

  if (!databaseUrl) {
    return 'DATABASE_URL doit être défini.';
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    return 'DATABASE_URL doit être une URL PostgreSQL valide.';
  }

  if (!['postgresql:', 'postgres:'].includes(parsed.protocol)) {
    return 'DATABASE_URL doit utiliser le protocole postgresql:// ou postgres://.';
  }

  const encodedPassword = parsed.password;
  let password = '';

  try {
    password = encodedPassword ? decodeURIComponent(encodedPassword) : '';
  } catch {
    return 'DATABASE_URL contient un mot de passe encodé invalide.';
  }

  if (!password) {
    return 'DATABASE_URL doit contenir un mot de passe de base de données.';
  }

  if (looksLikePlaceholder(password)) {
    return 'Le mot de passe dans DATABASE_URL ne doit pas conserver une valeur d\'exemple ou un placeholder.';
  }

  if (password.length < DEFAULT_MIN_SECRET_LENGTH) {
    return `Le mot de passe dans DATABASE_URL doit contenir au moins ${DEFAULT_MIN_SECRET_LENGTH} caractères.`;
  }

  return null;
}

function collectSecurityIssues(config: Record<string, unknown>): string[] {
  const checks: Array<string | null> = [
    databaseUrlIssue(config),
    secretIssue(config, 'JWT_SECRET', JWT_MIN_SECRET_LENGTH),
    secretIssue(config, 'ETL_API_KEY', ETL_API_KEY_MIN_LENGTH),
    effectiveStorageSecretIssue(config),
    optionalSecretIssue(config, 'POSTGRES_PASSWORD'),
    optionalSecretIssue(config, 'MINIO_ROOT_PASSWORD'),
    optionalSecretIssue(config, 'S3_SECRET_KEY'),
    optionalSecretIssue(config, 'SUPERSET_SECRET_KEY', JWT_MIN_SECRET_LENGTH),
  ];

  return checks.filter((issue): issue is string => Boolean(issue));
}

export function getConfiguredJwtSecret(value?: string): string {
  const jwtSecret = stringValue(value);

  if (jwtSecret) {
    return jwtSecret;
  }

  if (process.env.NODE_ENV === PRODUCTION) {
    throw new Error('JWT_SECRET doit être défini en production.');
  }

  return DEVELOPMENT_JWT_SECRET;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const nodeEnv = stringValue(config.NODE_ENV) || 'development';
  const normalizedNodeEnv = normalized(nodeEnv);
  const issues = collectSecurityIssues(config);

  if (normalizedNodeEnv === PRODUCTION && issues.length > 0) {
    throw new Error(
      [
        'Configuration de production invalide. Corrige les secrets critiques avant de démarrer :',
        ...issues.map((issue) => `- ${issue}`),
      ].join('\n'),
    );
  }

  if (normalizedNodeEnv !== PRODUCTION && issues.length > 0) {
    // Ne jamais journaliser les valeurs des secrets, uniquement les noms/raisons.
    // En développement, ces avertissements restent tolérants pour préserver le démarrage local.
    // En production, les mêmes erreurs provoquent l'arrêt immédiat ci-dessus.
    console.warn(
      [
        '[config] Secrets critiques absents ou faibles en environnement non-production :',
        ...issues.map((issue) => `- ${issue}`),
        '[config] Génère des valeurs fortes avant toute exécution partagée ou production.',
      ].join('\n'),
    );
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
  };
}
