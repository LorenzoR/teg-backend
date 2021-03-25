import DynamoDBMapperWrapper from './DynamoDBMapperWrapper';
import { WebSocketConnectionsRepositoryInterface } from './WebSocketConnectionsRepositoryInterface';
import WebSocketConnection from '../models/WebSocketConnection';

class DynamoDBWebSocketConnectionsRepository implements WebSocketConnectionsRepositoryInterface {
    private dynamoDBMapperWrapper!: DynamoDBMapperWrapper;

    public constructor(stage: string) {
        this.dynamoDBMapperWrapper = new DynamoDBMapperWrapper(stage);
    }

    public async insert(connection: WebSocketConnection): Promise<boolean> {
        return this.dynamoDBMapperWrapper.put(new WebSocketConnection(), connection);
    }

    public async getById(connectionId: string): Promise<WebSocketConnection> {
        const connection = await this.dynamoDBMapperWrapper.get(
            new WebSocketConnection(),
            { connectionId },
        ) as WebSocketConnection;

        return connection;
    }

    public async delete(connectionId: string): Promise<boolean> {
        return this.dynamoDBMapperWrapper.delete(new WebSocketConnection(), { connectionId });
    }
}

export default DynamoDBWebSocketConnectionsRepository;
