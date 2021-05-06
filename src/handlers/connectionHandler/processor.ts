import { APIGatewayProxyEvent } from 'aws-lambda';
import {
    GameService, APIGatewayWebsocketsServiceInterface,
    GameMessageServiceInterface, WebSocketConnectionsRepositoryInterface,
} from '@src/services';
import WebSocketConnection from '@src/models/WebSocketConnection';
import { GameStatusType } from '@src/models/Game';
import { Player } from '@src/models';
import { Logger } from '@src/utils';

interface ReturnType {
    statusCode: number;
    body: string;
}

// const localEndpoint = 'http://localhost:3001';

// const gameRepository = new DynamoDBGameRepository(process.env.STAGE || 'local');

// const gameService = new GameService(gameRepository);

// const apiGatewayWebsocketsService = new APIGatewayWebsocketsService(localEndpoint, process.env.STAGE || 'local');

/*
const webSocketConnectionRepository = new DynamoDBWebSocketConnectionsRepository(
    process.env.STAGE || 'local',
);
*/

// const gameMessageService = new GameMessageService({ apiGatewayWebsocketsService, gameRepository });

export class ConnectionHandlerProcessors {
    private gameService: GameService;

    private apiGatewayWebsocketsService: APIGatewayWebsocketsServiceInterface;

    private gameMessageService: GameMessageServiceInterface;

    private webSocketConnectionRepository: WebSocketConnectionsRepositoryInterface;

    public constructor(input: {
        gameService: GameService;
        apiGatewayWebsocketsService: APIGatewayWebsocketsServiceInterface;
        gameMessageService: GameMessageServiceInterface;
        webSocketConnectionRepository: WebSocketConnectionsRepositoryInterface;
    }) {
        this.gameService = input.gameService;
        this.apiGatewayWebsocketsService = input.apiGatewayWebsocketsService;
        this.gameMessageService = input.gameMessageService;
        this.webSocketConnectionRepository = input.webSocketConnectionRepository;
    }

    public async connectHandler(event: APIGatewayProxyEvent): Promise<ReturnType> {
        const { connectionId } = event.requestContext;
        // const isNewGame = false;

        // Add to guests so we have the connection ID
        const gameId = this.getGameIdFromEvent(event);

        if (!gameId || gameId === 'undefined') {
            const msg = 'No game ID found in event';
            Logger.debug(msg);
            return {
                statusCode: 200,
                body: JSON.stringify(msg),
            };
        }

        Logger.debug(`Trying to get game ID ${gameId}`);
        if (gameId) {
            Logger.debug(`game ID es ${gameId}`);
        } else {
            Logger.debug(`NO game ID, es ${gameId}`);
        }

        // Add connection
        const newConnection = new WebSocketConnection();
        newConnection.gameId = gameId;
        newConnection.connectionId = connectionId;
        await this.webSocketConnectionRepository.insert(newConnection);

        try {
            // Get players from game
            const game = await this.gameService.getGame(gameId);
            // const game = await gameRepository.getByID(gameId);

            // Check game exists
            if (!game) {
                /*
          Logger.debug(`Game not found, creating game ID ${gameId}`);
          // game = await gameService.newGame(gameId);
          game = (new Game()).initGame();
          game.UUID = gameId;
          isNewGame = true;
          Logger.debug(`Created game ID ${gameId}`);
          */

                Logger.error(`Game ${gameId} not found`);

                return {
                    statusCode: 400,
                    body: JSON.stringify(`Game ${gameId} not found`),
                };
            }

            /*
        // Add guest
        game.addGuest(event.requestContext.connectionId);
        Logger.debug(`Added guest ${event.requestContext.connectionId} to game ID ${gameId}`);
        */
            // Add player to game
            game.addPlayerWithoutColor(event.requestContext.connectionId);

            Logger.debug(`Added player without color with id ${event.requestContext.connectionId} to game ${gameId}`);

            // Update game
            const updatedGame = await this.gameService.updateGame(game);
            Logger.debug('Game updated', updatedGame);

            /*
            if (isNewGame) {
                await this.gameService.
                // await gameRepository.insert(game);
            } else {
                await this.gameService.updateGame(game);
                // await gameRepository.update(game);
            }
            */

            return {
                statusCode: 200,
                body: JSON.stringify(updatedGame),
            };
        } catch (error) {
            Logger.error(error);

            return {
                statusCode: 400,
                body: JSON.stringify(error),
            };
        }
    }

    public async reConnectHandler(event: APIGatewayProxyEvent): Promise<ReturnType> {
        // Re-connect player to game
        const eventBody = JSON.parse(event.body);

        const { gameId, color, cachedConnectionId } = eventBody.data;
        const { connectionId } = event.requestContext;

        try {
            const game = await this.gameService.getGame(gameId);
            // const game = await gameRepository.getByID(gameId);

            if (!game) {
                Logger.error(`Game ID ${gameId} not found`);

                return {
                    statusCode: 400,
                    body: JSON.stringify(`Game ID ${gameId} not found`),
                };
            }

            let response: { player: Player; players: Player[]; };

            // Try to get game
            if (cachedConnectionId) {
                Logger.debug('cached!');

                if (game.hasStarted()) {
                    // Check if player color and Id match
                    const player = game.getPlayerByColor(color);

                    // Player color and ID ok
                    if (player && player.id === cachedConnectionId) {
                        response = game.reConnectPlayer(color, connectionId);
                    }
                }
            } else {
                response = game.reConnectPlayer(color, connectionId);
            }

            // // Remove guest with those IDs
            // game.removeGuest(connectionId);

            // if (cachedConnectionId) {
            //   game.removeGuest(cachedConnectionId);
            // }

            if (response) {
                Logger.debug('response', response);

                // Update game
                await this.gameService.updateGame(game);
                // await gameService.updateGame(game);

                // Send game info to everyone
                this.apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
                await this.gameMessageService.sendGameInfoToAllPlayers(game);
                Logger.debug('message sent to all players!');

                // Send re-connected player
                const payload = {
                    action: 'reJoinGame',
                    body: {
                        reConnectedPlayerName: response.player.name,
                        players: response.players,
                    },
                };

                this.apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
                await this.apiGatewayWebsocketsService.sendMessageToAllPlayers({
                    game,
                    data: JSON.stringify(payload),
                    gameService: this.gameService,
                });
            }

            return {
                statusCode: 200,
                body: JSON.stringify(game),
            };
        } catch (error) {
            Logger.error(error);

            return {
                statusCode: 400,
                body: JSON.stringify(error),
            };
        }
    }

    public async disconnectHandler(event: APIGatewayProxyEvent): Promise<ReturnType> {
        const { connectionId } = event.requestContext;
        const webSocketConection = await this.webSocketConnectionRepository.getById(connectionId);

        // Game not found
        if (!webSocketConection || !webSocketConection.gameId) {
            const errorMsg = `No game found for connection ${connectionId}`;
            return {
                statusCode: 400,
                body: JSON.stringify(errorMsg),
            };
        }

        const { gameId } = webSocketConection;
        const playerId = event.requestContext.connectionId;

        try {
            // Remove connection
            await this.webSocketConnectionRepository.delete(connectionId);

            // Get game
            const game = await this.gameService.getGame(gameId);

            let payload;
            let isAdmin = false;

            // If game has started, send message
            if (game && game.gameStatus === GameStatusType.STARTED) {
                // const player = _.find(game.guests, (obj) => obj.id === playerId);

                // Remove from players
                const removedPlayer = game.removePlayer(playerId);
                // const removedPlayer = await gameService.removePlayer(gameId, playerId);
                Logger.debug('Players Removed!', removedPlayer);

                // Update game
                // await gameService.updateGame(game);
                await this.gameService.updateGame(game);
                Logger.debug('Game updated');

                Logger.debug('Players', game.players);

                const payloadBody = { players: game.players, disconnectedPlayerName: removedPlayer?.name || '' };
                payload = { action: 'playerDisconnected', body: payloadBody };

                // setEndpointFromEvent(event);
                // await sendMessageToAllPlayers(gameId, JSON.stringify(payload));
            } else if (game && game.gameStatus === GameStatusType.WAITING_PLAYERS) {
                /*
          // Look in guests
          let player = _.find(game.guests, (obj) => obj.id === playerId);

          // If not found, look in players
          if (!player) {
            player = _.find(game.players, (obj) => obj.id === playerId);
          }
          */
                const player = game.players.find((obj) => obj.id === playerId);

                if (!player) {
                    Logger.error(`Player ${playerId} not found`);

                    return {
                        statusCode: 400,
                        body: JSON.stringify(`Player ${playerId} not found`),
                    };
                }

                // Remove from guests
                // game.removeGuest(playerId);
                // Logger.debug(`Guest ${playerId} removed!`);

                isAdmin = player.isAdmin;

                const removedPlayer = game.removePlayer(playerId);
                // const removedPlayer = await gameService.removePlayer(gameId, playerId);
                Logger.debug('Player Removed!', removedPlayer);

                // Update game only if player was not admin
                // If player is admin game will be removed so no need to update
                if (!isAdmin) {
                    // await gameService.updateGame(game);
                    await this.gameService.updateGame(game);
                    Logger.debug('Game updated');
                }

                const payloadBody = { isAdmin };
                payload = { action: 'guestDisconnected', body: payloadBody };

                // setEndpointFromEvent(event);
                // await sendMessageToAllPlayers(gameId, JSON.stringify(payload));
            }

            this.apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
            await this.apiGatewayWebsocketsService.sendMessageToAllPlayers({
                game,
                // gameRepository,
                data: JSON.stringify(payload),
                gameService: this.gameService,
            });
            Logger.debug('Message sent', payload);

            // If admin left, delete game
            if (isAdmin) {
                await this.gameService.deleteGame(gameId);
                // await gameService.deleteGame(gameId);
            }

            return {
                statusCode: 200,
                body: JSON.stringify(game),
            };
        } catch (error) {
            Logger.error(error);

            return {
                statusCode: 400,
                body: JSON.stringify(error),
            };
        }
    }

    // eslint-disable-next-line camelcase
    private getGameIdFromEvent = (event: APIGatewayProxyEvent): string | undefined => event?.queryStringParameters?.game_id;
}
