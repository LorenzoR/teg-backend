import { v4 as uuidv4 } from 'uuid';
import WebSocketConnection from '@src/models/WebSocketConnection';
import { DynamoDBWebSocketConnectionsRepository } from '../DynamoDBWebSocketConnectionsRepository';

const dynamoDBWebSocketConnectionsRepository = new DynamoDBWebSocketConnectionsRepository('local');

const connection: WebSocketConnection = Object.assign(new WebSocketConnection(), {
    connectionId: uuidv4(),
    gameId: uuidv4(),
});

describe('dynamoDB Web Socket Connections Repository', () => {
    it('can insert a connection', async () => {
        expect.hasAssertions();

        const result = await dynamoDBWebSocketConnectionsRepository.insert(connection);

        expect(result).toBeDefined();
        expect(result).toBe(true);
    });

    it('can get a connection', async () => {
        expect.hasAssertions();

        const result = await dynamoDBWebSocketConnectionsRepository.getById(connection.connectionId);

        expect(result).toBeDefined();
        expect(result.gameId).toBe(connection.gameId);
        expect(result.connectionId).toBe(connection.connectionId);
    });

    it('can delete a connection', async () => {
        expect.hasAssertions();

        const result = await dynamoDBWebSocketConnectionsRepository.delete(connection.connectionId);

        expect(result).toBeDefined();
        expect(result).toBe(true);
    });
});
