import { APIGatewayProxyEvent } from 'aws-lambda';
import { ApiGatewayManagementApi } from 'aws-sdk';

import { Game } from '@src/models';
import { Logger } from '@src/utils';
import { APIGatewayWebsocketsServiceInterface } from './APIGatewayWebsocketsServiceInterface';
import { GameService } from './GameService';

export class APIGatewayWebsocketsService implements APIGatewayWebsocketsServiceInterface {
    private apigwManagementApi!: ApiGatewayManagementApi;

    public constructor(endpoint: string, stage = 'local', apiVersion = '2018-11-29') {
        if (stage === 'local') {
            this.apigwManagementApi = new ApiGatewayManagementApi({
                apiVersion,
                endpoint,
                accessKeyId: 'DEFAULT_ACCESS_KEY', // needed if you don't have aws credentials at all in env
                secretAccessKey: 'DEFAULT_SECRET', // needed if you don't have aws credentials at all in env
                region: 'eu-west-1',
            });
        } else {
            this.apigwManagementApi = new ApiGatewayManagementApi({
                apiVersion,
                endpoint,
                region: 'eu-west-1',
            });
        }
    }

    public setEndpointFromLambdaEvent(event: APIGatewayProxyEvent): void {
        if (event.requestContext.domainName !== 'localhost') {
            const endpoint = `${event.requestContext.domainName}/${event.requestContext.stage}`;
            this.setEndpoint(endpoint);
            Logger.debug('endpoint', endpoint);
        }
    }

    public setEndpoint(endpoint: string, apiVersion = '2018-11-29'): void {
        this.apigwManagementApi = new ApiGatewayManagementApi({
            apiVersion,
            endpoint,
        });
    }

    public async send(connectionId: string, data: ApiGatewayManagementApi.PostToConnectionRequest['Data']): Promise<boolean> {
        if (connectionId) {
            try {
                await this.apigwManagementApi
                    .postToConnection({ ConnectionId: connectionId, Data: data })
                    .promise();

                return true;
            } catch (error) {
                Logger.error('APIGatewayWebsocketsService::send ERROR', error.message);
                return false;
            }
        }

        // No connection ID
        return false;
    }

    public async broadcast(
        data: ApiGatewayManagementApi.PostToConnectionRequest['Data'],
        connectionIds: string[],
    ): Promise<{ id: string; response: boolean } []> {
        // Remove duplicates
        const uniqueConnectionIds = [...new Set(connectionIds)];
        const promises = [];

        uniqueConnectionIds.forEach((connectionId) => {
            promises.push(this.send(connectionId, data));
        });

        const promiseResponse = await Promise.all(promises);

        const response: { id: string; response: boolean } [] = [];

        promiseResponse.forEach((aResponse, index) => {
            response.push({ id: uniqueConnectionIds[index], response: aResponse });
        });

        Logger.debug('Broadcast response', response);

        return response;
    }

    public async broadcastDifferentData(
        data: ApiGatewayManagementApi.PostToConnectionRequest['Data'][],
        connectionIds: string[],
    ): Promise<{ id: string; response: boolean } []> {
        // Remove duplicates
        const uniqueConnectionIds = [...new Set(connectionIds)];
        const promises = [];

        uniqueConnectionIds.forEach((connectionId, index) => {
            promises.push(this.send(connectionId, data[index]));
        });

        const promiseResponse = await Promise.all(promises);

        const response: { id: string; response: boolean } [] = [];

        promiseResponse.forEach((aResponse, index) => {
            response.push({ id: uniqueConnectionIds[index], response: aResponse });
        });

        Logger.debug('BroadcastDifferentData response', response);

        return response;
    }

    // TODO. Remove gameRepository
    public async sendMessageToAllPlayers(
        input: {
            game: Game;
            data: ApiGatewayManagementApi.PostToConnectionRequest['Data'];
            gameService: GameService;
        },
    ): Promise<boolean> {
        const {
            game, data, gameService,
        } = input;

        if (!game) {
            throw new Error('No game');
        }

        // Get online players
        const onlinePlayers = game.getOnlinePlayers();

        const connectionIds = onlinePlayers.map((o) => o.id);

        Logger.debug('sending to ', connectionIds);

        try {
            let updateGame = false;
            const responses = await this.broadcast(data, connectionIds);

            // Set player offline if response is false
            responses.forEach((response) => {
                if (!response.response) {
                    const player = game.getPlayerById(response.id);
                    if (player) {
                        Logger.debug(`Set player ${player.id} to offline`);
                        player.playerStatus = 'offline';
                        updateGame = true;
                    }
                }
            });

            if (updateGame) {
                await gameService.updateGame(game);
            }

            return true;
        } catch (error) {
            Logger.error(error);
            return false;
        }
    }
}
