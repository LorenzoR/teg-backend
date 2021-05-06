import { APIGatewayProxyEvent } from 'aws-lambda';
import 'source-map-support/register';
import { Game, Player } from '@src/models';
import { APIGatewayWebsocketsServiceInterface, GameService, GameMessageServiceInterface } from '@src/services';
import { Logger } from '@src/utils';

interface ReturnType {
    statusCode: number;
    body: string;
    headers?: Record<string, string | boolean>;
}

const ActionTypes = {
    TROOPS_ADDED: 'troopsAdded',
    ROUND_FINISHED: 'roundFinished',
};

export class GameHandlerProcessors {
    private gameService: GameService;

    private apiGatewayWebsocketsService: APIGatewayWebsocketsServiceInterface;

    private gameMessageService: GameMessageServiceInterface;

    public constructor(input: {
        gameService: GameService;
        apiGatewayWebsocketsService: APIGatewayWebsocketsServiceInterface;
        gameMessageService: GameMessageServiceInterface;
    }) {
        this.gameService = input.gameService;
        this.apiGatewayWebsocketsService = input.apiGatewayWebsocketsService;
        this.gameMessageService = input.gameMessageService;
    }

    public async newGameHandler(event: APIGatewayProxyEvent): Promise<ReturnType> {
        try {
            const newGameId = Game.generateNewGameUUID();

            Logger.debug(`Creating game with ID ${newGameId}`);

            const game = await this.gameService.newGame(newGameId);

            Logger.debug('created game', game);

            if (!game) {
                return {
                    statusCode: 400,
                    body: 'Error creating game',
                };
            }

            /*
            const game = new Game();
            game.UUID = newGameId;
            await dependencies.gameRepository.insert(game);
            */

            return {
                statusCode: 200,
                body: JSON.stringify({ newGameId: game.UUID }),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                },
            };
        } catch (error) {
            Logger.debug('Event: ', event);
            Logger.error(error);

            return {
                statusCode: 400,
                body: JSON.stringify(error.message),
            };
        }
    }

    public async joinGameHandler(event: APIGatewayProxyEvent): Promise<ReturnType> {
        // Add player to game
        const eventBody = JSON.parse(event.body);

        const { gameId, cachedConnectionId, color } = eventBody.data;
        const { connectionId } = event.requestContext;

        let joinGameResult;

        try {
            // Get game
            // const game = await gameService.getGame(gameId);
            const game = await this.gameService.getGame(gameId);

            if (!game) {
                const msg = `Game ID ${gameId} not found`;
                Logger.debug(msg);
                return {
                    statusCode: 200,
                    body: JSON.stringify(msg),
                };
            }

            Logger.debug(`Got game ID ${game.UUID}`);

            if (game.hasStarted()) {
                joinGameResult = await this.joinStartedGame({
                    game, color, cachedConnectionId, event, connectionId,
                });
            } else {
                joinGameResult = await this.joinNotStartedGame({
                    game, event, eventBody,
                });
            }

            Logger.debug('joinGameResult, ', joinGameResult);

            // Update game
            // TODO. This should be done before sending message to players
            // await gameService.updateGame(game);
            await this.gameService.updateGame(game);
            Logger.debug('Updated game');
            Logger.debug('Updated game players', game.players);

            return {
                statusCode: 200,
                body: JSON.stringify(joinGameResult),
            };
        } catch (error) {
            Logger.error(error);

            return {
                statusCode: 200,
                body: JSON.stringify(error),
            };
        }
    }

    public async startGameHandler(event: APIGatewayProxyEvent): Promise<ReturnType> {
        Logger.debug('Start Game handler');

        const eventBody = JSON.parse(event.body);
        const { gameId } = eventBody.data;

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

            game.startGame();
            Logger.debug('Game started!', game);

            // Update game
            // const updatedGame = await gameRepository.update(game);
            const updatedGame = await this.gameService.updateGame(game);
            Logger.debug('Game updated', updatedGame);

            // const response = { action: 'gameStarted', body: game };

            this.apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
            // await sendMessageToAllPlayers(game, JSON.stringify(response));
            await this.gameMessageService.sendGameInfoToEachPlayer(game);
            Logger.debug('Message sent to all players!');

            // Send connection ID to each player
            await this.gameMessageService.sendConnectionIdToEachPlayer(gameId);

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

    public async finishRoundHandler(event: APIGatewayProxyEvent): Promise<ReturnType> {
        const eventBody = JSON.parse(event.body);
        const { gameId, playerColor } = eventBody.data;

        if (!gameId) {
            throw new Error('No game ID found');
        }

        if (!playerColor) {
            throw new Error('No player color');
        }

        const playerId = event.requestContext.connectionId;

        if (!playerId) {
            throw new Error('No player ID found');
        }

        try {
            // Get game
            const game = await this.gameService.getGame(gameId);
            // const game = await gameRepository.getByID(gameId);

            if (!game) {
                Logger.error(`Game ID ${gameId} not found`);

                return {
                    statusCode: 400,
                    body: JSON.stringify(`Game ID ${gameId} not found`),
                };
            }

            Logger.debug(`Got game ${gameId}`, game);

            // Finish round
            try {
                game.finishTurn(playerId);
            } catch (error) {
                Logger.error('finishRoundHandler error', error);

                // Send error message
                const errorPayload = { action: 'error', body: { errorMsg: error.message } };
                // Send message to that player
                this.apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
                await this.apiGatewayWebsocketsService.send(playerId, JSON.stringify(errorPayload));

                return {
                    statusCode: 400,
                    body: JSON.stringify(error.message),
                };
            }

            Logger.debug(`Player ${playerColor} finished his turn`);

            // Get game
            const response = await this.gameService.updateGame(game);
            // const response = await gameRepository.update(game);
            Logger.debug('Game updated', game);

            const message = { action: ActionTypes.ROUND_FINISHED, body: response };

            this.apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
            await this.apiGatewayWebsocketsService.sendMessageToAllPlayers({
                game,
                data: JSON.stringify(message),
                gameService: this.gameService,
            });
            Logger.debug('Message sent to all players!');

            return {
                statusCode: 200,
                body: JSON.stringify(response),
            };
        } catch (error) {
            Logger.error(error);
            return {
                statusCode: 400,
                body: JSON.stringify(error),
            };
        }
    }

    private joinStartedGame = async (input: {
        game: Game;
        color: string;
        connectionId: string;
        event: APIGatewayProxyEvent;
        cachedConnectionId?: string;
    }): Promise<{ player: Player; players: Player[]; }> => {
        const {
            game, connectionId, color, cachedConnectionId, event,
        } = input;

        let response: { player: Player; players: Player[]; };

        // Game already started so try to reconnect
        // Try to get game
        if (cachedConnectionId) {
            Logger.debug('Cached!');
            // Check if player color and Id match
            const player = game.getPlayerByColor(color);

            // Player color and ID ok
            if (player && player.id === cachedConnectionId) {
                response = game.reConnectPlayer(color, connectionId);
            }
        } else {
            response = game.reConnectPlayer(color, connectionId);
            Logger.debug('Players after reconnect', game.players);
        }

        // Remove guest with those IDs
        // game.removeGuest(connectionId);

        // if (cachedConnectionId) {
        //   game.removeGuest(cachedConnectionId);
        // }

        if (response) {
            Logger.debug('response', response);

            // Send game info to everyone
            this.apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
            await this.gameMessageService.sendGameInfoToAllPlayers(game);
            Logger.debug('Message sent to all players!');

            // Send re-connected player
            const payload = {
                action: 'reJoinGame',
                body: {
                    reConnectedPlayerName: response.player.name,
                    players: response.players,
                },
            };

            // setEndpointFromEvent(event);
            await this.apiGatewayWebsocketsService.sendMessageToAllPlayers({
                game,
                data: JSON.stringify(payload),
                gameService: this.gameService,
            });
        }

        return response;
    };

    private joinNotStartedGame = async (input: {
        game: Game;
        event: APIGatewayProxyEvent;
        eventBody: { data: { username: string; color: string; } };
    }) => {
        Logger.debug('joinNotStartedGame');
        const {
            game, event, eventBody,
        } = input;

        // Game not started yet so look for that player
        if (!game.assignColorAndNameToExistingPlayer(event.requestContext.connectionId, eventBody.data.username, eventBody.data.color)) {
            // Player not found so add it
            const newPlayer = {
                id: event.requestContext.connectionId,
                name: eventBody.data.username,
                color: eventBody.data.color,
            };

            game.addPlayer(newPlayer);
            Logger.debug(`Player ${newPlayer.color} added!`);
        }

        // // Remove from guests
        // game.removeGuest(newPlayer.id);

        // Send message with players
        const response = { action: 'joinGame', body: game };

        this.apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
        await this.apiGatewayWebsocketsService.sendMessageToAllPlayers({
            game,
            data: JSON.stringify(response),
            gameService: this.gameService,
        });
        Logger.debug('Message sent to all players!');

        return response;
    };
}
