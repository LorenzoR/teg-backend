// import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { ApiGatewayManagementApi } from 'aws-sdk';

import Game from '../models/Game';
import { GameRepositoryInterface } from './GameRepositoryInterface';

class APIGatewayWebsocketsService {
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
            console.log('endpoint', endpoint);
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
                console.error('APIGatewayWebsocketsService::send ERROR', error.message);
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

        console.log('Broadcast response', response);

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

        console.log('BroadcastDifferentData response', response);

        return response;
    }

    public async sendMessageToAllPlayers(
        game: Game,
        gameRepository: GameRepositoryInterface,
        data: ApiGatewayManagementApi.PostToConnectionRequest['Data'],
    ): Promise<boolean> {
        if (!game) {
            throw new Error('No game');
        }

        // Get online players
        const onlinePlayers = game.getOnlinePlayers();

        const connectionIds = onlinePlayers.map((o) => o.id);

        console.log('sending to ', connectionIds);

        try {
            let updateGame = false;
            const responses = await this.broadcast(data, connectionIds);

            // Set player offline if response is false
            responses.forEach((response) => {
                if (!response.response) {
                    const player = game.getPlayerById(response.id);
                    if (player) {
                        console.log(`Set player ${player.id} to offline`);
                        player.playerStatus = 'offline';
                        updateGame = true;
                    }
                }
            });

            if (updateGame) {
                await gameRepository.update(game);
            }

            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }
}

export default APIGatewayWebsocketsService;
