import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import {
    GameMessageService, DynamoDBWebSocketConnectionsRepository, DynamoDBGameRepository,
    APIGatewayWebsocketsService, GameService,
} from '@src/services';
import { Logger } from '@src/utils';
import { ConnectionHandlerProcessors } from './processor';

const localEndpoint = 'http://localhost:3001';

const gameRepository = new DynamoDBGameRepository(process.env.STAGE || 'local');

const gameService = new GameService(gameRepository);

const apiGatewayWebsocketsService = new APIGatewayWebsocketsService(localEndpoint, process.env.STAGE || 'local');

const webSocketConnectionRepository = new DynamoDBWebSocketConnectionsRepository(
    process.env.STAGE || 'local',
);

const gameMessageService = new GameMessageService({ apiGatewayWebsocketsService, gameRepository });

const connectionHandlerProcessors = new ConnectionHandlerProcessors({
    gameService,
    apiGatewayWebsocketsService,
    gameMessageService,
    webSocketConnectionRepository,
});

export const connectHandler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    Logger.debug('Connect Handler', event);
    return connectionHandlerProcessors.connectHandler(event);
};

export const reConnectHandler: APIGatewayProxyHandler = async (event) => {
    Logger.debug('Re-Connect Handler', event);
    return connectionHandlerProcessors.reConnectHandler(event);
};

export const disconnectHandler: APIGatewayProxyHandler = async (event) => {
    Logger.debug('Disconnect handler', event);
    return connectionHandlerProcessors.disconnectHandler(event);
};
