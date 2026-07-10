import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class AlertesGateway {
  @WebSocketServer() server!: Server;
  broadcastAlert(alert: unknown) { this.server.emit('alert', alert); }
}
