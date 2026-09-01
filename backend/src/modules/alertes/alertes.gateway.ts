import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AlertesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AlertesGateway.name);

  @WebSocketServer()
  server!: Server;

  afterInit() {
    this.logger.log('[AlertesGateway] WebSocket Gateway initialisé');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`[AlertesGateway] Client connecté: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`[AlertesGateway] Client déconnecté: ${client.id}`);
  }

  broadcastAlert(alert: unknown) {
    try {
      if (this.server) {
        this.server.emit('alert', alert);
      }
    } catch (err: any) {
      this.logger.warn(
        `[AlertesGateway] Impossible d'émettre l'alerte: ${err?.message}`,
      );
    }
  }
}
