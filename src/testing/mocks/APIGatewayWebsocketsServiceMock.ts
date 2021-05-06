import { APIGatewayProxyEvent } from 'aws-lambda';
import { ApiGatewayManagementApi } from 'aws-sdk';

import { Game } from '@src/models';
import { Logger } from '@src/utils';
import { APIGatewayWebsocketsServiceInterface } from '../../services/APIGatewayWebsocketsServiceInterface';
import { GameService } from '../../services/GameService';

export class APIGatewayWebsocketsServiceMock implements APIGatewayWebsocketsServiceInterface {
    private isCalled = false;

    public setEndpointFromLambdaEvent(event: APIGatewayProxyEvent): void {
        if (event.requestContext.domainName !== 'localhost') {
            const endpoint = `${event.requestContext.domainName}/${event.requestContext.stage}`;
            this.setEndpoint(endpoint);
            Logger.debug('endpoint', endpoint);
        }
    }

    public setEndpoint(endpoint: string, apiVersion = '2018-11-29'): void {
        this.called(`setEndpoint with ${endpoint} and ${apiVersion}`);
    }

    public async send(connectionId: string, data: ApiGatewayManagementApi.PostToConnectionRequest['Data']): Promise<boolean> {
        this.called(`send with ${connectionId} and ${data}`);

        return true;
    }

    public async broadcast(
        data: ApiGatewayManagementApi.PostToConnectionRequest['Data'],
        connectionIds: string[],
    ): Promise<{ id: string; response: boolean } []> {
        this.called(`broadcast with ${data} and ${connectionIds}`);

        return connectionIds.map((o) => ({
            id: o,
            response: true,
        }));
    }

    public async broadcastDifferentData(
        data: ApiGatewayManagementApi.PostToConnectionRequest['Data'][],
        connectionIds: string[],
    ): Promise<{ id: string; response: boolean } []> {
        this.called(`broadcastDifferentData with ${data} and ${connectionIds}`);

        return connectionIds.map((o) => ({
            id: o,
            response: true,
        }));
    }

    // TODO. Remove gameRepository
    public async sendMessageToAllPlayers(input: {
        game: Game;
        data: ApiGatewayManagementApi.PostToConnectionRequest['Data'];
        gameService: GameService;
    }): Promise<boolean> {
        this.called(`broadcastDifferentData with ${input}`);

        await input.gameService.updateGame(input.game);

        return true;
    }

    private called(message: string) {
        this.isCalled = true;
        Logger.debug(`Called ${this.isCalled} with message`, message);
    }
}
