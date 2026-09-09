import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UsersService } from '../users/users.service';

@WebSocketGateway({
  cors: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      const rawAllowedOrigins =
        process.env.CORS_ALLOWED_ORIGINS ??
        process.env.FRONTEND_URL ??
        'http://localhost:3000';

      const allowedOrigins = rawAllowedOrigins
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);

      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*')
      ) {
        callback(null, true);
      } else {
        callback(new Error(`WebSocket CORS non autorisé : ${origin}`), false);
      }
    },
    credentials: false,
  },
})
export class AlertesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AlertesGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  @WebSocketServer()
  server!: Server;

  afterInit() {
    this.logger.log(
      '[AlertesGateway] WebSocket Gateway initialisé avec sécurité JWT & CORS restreint',
    );
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
        client.handshake.query?.token;

      if (!token || typeof token !== 'string') {
        this.logger.warn(
          `[AlertesGateway] Connexion WebSocket rejetée (token manquant) - Client : ${client.id}`,
        );
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        role?: string;
      }>(token);

      if (!payload || !payload.sub) {
        this.logger.warn(
          `[AlertesGateway] Connexion WebSocket rejetée (token invalide) - Client : ${client.id}`,
        );
        client.disconnect(true);
        return;
      }

      const user = await this.usersService.findOne(payload.sub);
      if (!user || !user.isActive) {
        this.logger.warn(
          `[AlertesGateway] Connexion WebSocket rejetée (utilisateur inactif ou introuvable) - Client : ${client.id}`,
        );
        client.disconnect(true);
        return;
      }

      (client as any).user = user;
      this.logger.log(
        `[AlertesGateway] Client authentifié connecté : ${user.email} (${client.id})`,
      );
    } catch (error: any) {
      this.logger.warn(
        `[AlertesGateway] Échec authentification WebSocket pour le client ${client.id} : ${error?.message}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`[AlertesGateway] Client déconnecté : ${client.id}`);
  }

  broadcastAlert(alert: unknown) {
    try {
      if (this.server) {
        this.server.emit('alert', alert);
      }
    } catch (err: any) {
      this.logger.warn(
        `[AlertesGateway] Impossible d’émettre l’alerte : ${err?.message}`,
      );
    }
  }
}
