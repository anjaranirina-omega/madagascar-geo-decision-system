import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { timingSafeEqual } from 'crypto';

/**
 * Guard hybride d'authentification pour les endpoints machine-to-machine et utilisateur.
 *
 * Supporte :
 * 1. Une clé API statique interne (M2M) via l'en-tête `X-API-KEY`, `X-API-TOKEN` ou `Authorization: ApiKey <token>`
 *    -> Attribue l'identité de service avec le rôle dédié `SYSTEM`.
 * 2. Un jeton JWT utilisateur standard via `Authorization: Bearer <token>` (délégué à Passport JWT).
 *
 * Sécurité :
 * - Comparaison de la clé en temps constant (`crypto.timingSafeEqual`) pour prévenir les attaques temporelles.
 * - Aucune journalisation (log) de la clé en clair, même en cas d'échec d'authentification.
 *
 * Pour régénérer une nouvelle clé API ETL :
 * $ node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * Puis mettre à jour la variable `ETL_API_KEY` dans `backend/.env`.
 */
@Injectable()
export class ApiKeyOrJwtGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. Recherche d'une clé API dans les en-têtes standard
    const apiKeyHeader =
      request.headers['x-api-key'] ||
      request.headers['X-API-KEY'] ||
      request.headers['x-api-token'];

    let providedKey =
      typeof apiKeyHeader === 'string' ? apiKeyHeader.trim() : null;

    const authHeader = request.headers['authorization'];
    if (!providedKey && typeof authHeader === 'string') {
      const trimmed = authHeader.trim();
      if (trimmed.toLowerCase().startsWith('apikey ')) {
        providedKey = trimmed.slice(7).trim();
      }
    }

    const configuredApiKey = this.configService.get<string>('ETL_API_KEY');

    // 2. Vérification de la clé API si fournie et configurée
    if (providedKey && configuredApiKey) {
      const isMatch = this.safeCompare(providedKey, configuredApiKey);

      if (isMatch) {
        // Associe le principal de service avec le rôle restreint SYSTEM
        request.user = {
          id: 'system-service-etl',
          email: 'etl-service@riskclim.mg',
          firstName: 'ETL',
          lastName: 'Service',
          role: {
            id: 'role-system',
            name: 'SYSTEM',
          },
        };
        return true;
      }

      // Rejet immédiat sans divulgation de la clé attendue ou reçue
      throw new UnauthorizedException('Clé API ou identifiant de service non autorisé.');
    }

    // 3. Repli vers la validation classique JWT utilisateur
    return (await super.canActivate(context)) as boolean;
  }

  /**
   * Comparaison en temps constant pour éviter les attaques par canal auxiliaire (timing attacks).
   */
  private safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    if (bufA.length !== bufB.length) {
      return false;
    }

    return timingSafeEqual(bufA, bufB);
  }
}
