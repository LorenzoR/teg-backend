import { APIGatewayProxyEvent } from 'aws-lambda';
import { ApiGatewayManagementApi } from 'aws-sdk';
import { Game } from '@src/models';
import { GameRepositoryInterface } from './GameRepositoryInterface';
import { GameService } from './GameService';

interface SendMessageToAllPlayersInput {
    game: Game;
    data: ApiGatewayManagementApi.PostToConnectionRequest['Data'];
    gameService?: GameService;
    gameRepository?: GameRepositoryInterface;
}

export interface APIGatewayWebsocketsServiceInterface {
    setEndpointFromLambdaEvent(event: APIGatewayProxyEvent): void;
    setEndpoint(endpoint: string, apiVersion): void;
    send(
        connectionId: string,
        data: ApiGatewayManagementApi.PostToConnectionRequest['Data']
    ): Promise<boolean>;
    broadcast(
        data: ApiGatewayManagementApi.PostToConnectionRequest['Data'],
        connectionIds: string[],
    ): Promise<{ id: string; response: boolean }[]>;
    broadcastDifferentData(
        data: ApiGatewayManagementApi.PostToConnectionRequest['Data'][],
        connectionIds: string[],
    ): Promise<{ id: string; response: boolean }[]>;
    sendMessageToAllPlayers(input: SendMessageToAllPlayersInput): Promise<boolean>;
}
