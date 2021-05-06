import { JsonDB } from 'node-json-db';
import { Config } from 'node-json-db/dist/lib/JsonDBConfig';
import { WebSocketConnectionsRepositoryInterface } from '@src/services/WebSocketConnectionsRepositoryInterface';
import WebSocketConnection from '@src/models/WebSocketConnection';
import { Logger } from '@src/utils';

export class DynamoDBWebSocketConnectionsRepositoryMock implements WebSocketConnectionsRepositoryInterface {
    private isCalled = false;

    private jsonDB: JsonDB;

    public constructor() {
        this.jsonDB = new JsonDB(new Config('/tmp/myTestDataBase', true, true, '/'));
    }

    public async insert(connection: WebSocketConnection): Promise<boolean> {
        this.called(`insert with ${connection}`);
        this.jsonDB.push(`/connection-${connection.connectionId}`, connection);
        return true;
    }

    public async getById(connectionId: string): Promise<WebSocketConnection> {
        this.called(`getById with ${connectionId}`);
        const webSocketConnection = Object.assign(new WebSocketConnection(), this.jsonDB.getData(`/connection-${connectionId}`));

        return webSocketConnection;
    }

    public async delete(connectionId: string): Promise<boolean> {
        this.called(`delete with ${connectionId}`);
        this.jsonDB.delete(`/connection-${connectionId}`);
        return true;
    }

    private called(message: string) {
        this.isCalled = true;
        Logger.debug(`Called ${this.isCalled} with message`, message);
    }
}
