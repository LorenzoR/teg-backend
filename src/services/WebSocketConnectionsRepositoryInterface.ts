import WebSocketConnection from '../models/WebSocketConnection';

export interface WebSocketConnectionsRepositoryInterface {
  insert(connection: WebSocketConnection): Promise<boolean>;
  getById(connectionId: string): Promise<WebSocketConnection>;
  // update(game: Game): Promise<Game>;
  delete(UUID: string): Promise<boolean>;
}
