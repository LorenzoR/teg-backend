import { APIGatewayProxyEvent } from 'aws-lambda';
import 'source-map-support/register';
import Game from '../../../models/Game';
import { GameRepositoryInterface } from '../../../services/GameRepositoryInterface';
import APIGatewayWebsocketsService from '../../../services/APIGatewayWebsocketsService';
import GameMessageService from '../../../services/GameMessageService';

export class GameHandlerProcessors {
    private gameRepository: GameRepositoryInterface;

    private apiGatewayWebsocketsService: APIGatewayWebsocketsService;

    private gameMessageService: GameMessageService;

    public constructor(input: {
        gameRepository: GameRepositoryInterface;
        apiGatewayWebsocketsService: APIGatewayWebsocketsService;
        gameMessageService: GameMessageService;
    }) {
        this.gameRepository = input.gameRepository;
        this.apiGatewayWebsocketsService = input.apiGatewayWebsocketsService;
        this.gameMessageService = input.gameMessageService;
    }

    public async joinGameHandler(event: APIGatewayProxyEvent): Promise<{ statusCode: number; body: string; }> {
        console.log('Join Game Handler');
        console.log('EVENTOOOOO', event);
        // Add player to game
        const eventBody = JSON.parse(event.body);

        const { gameId, cachedConnectionId, color } = eventBody.data;
        const { connectionId } = event.requestContext;

        let response;

        try {
            // Get game
            // const game = await gameService.getGame(gameId);
            const game = await this.gameRepository.getByID(gameId);

            if (!game) {
                const msg = `Game ID ${gameId} not found`;
                console.log(msg);
                return {
                    statusCode: 200,
                    body: JSON.stringify(msg),
                };
            }

            console.log(`Got game ID ${game.UUID}`);

            if (game.hasStarted()) {
                response = this.joinStartedGame({
                    game, color, cachedConnectionId, event, connectionId,
                });
            } else {
                response = this.joinNotStartedGame({
                    game, event, eventBody,
                });
            }

            console.log('Reponse, ', response);

            // Update game
            // TODO. This should be done before sending message to players
            // await gameService.updateGame(game);
            await this.gameRepository.update(game);
            console.log('Updated game');
            console.log('Updated game players', game.players);

            return {
                statusCode: 200,
                body: JSON.stringify('joinGameHandler OK!'),
            };
        } catch (error) {
            console.error(error);

            return {
                statusCode: 200,
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
    }) => {
        const {
            game, connectionId, color, cachedConnectionId, event,
        } = input;

        let response;

        // Game already started so try to reconnect
        // Try to get game
        if (cachedConnectionId) {
            console.log('Cached!');
            // Check if player color and Id match
            const player = game.getPlayerByColor(color);

            // Player color and ID ok
            if (player && player.id === cachedConnectionId) {
                response = game.reConnectPlayer(color, connectionId);
            }
        } else {
            response = game.reConnectPlayer(color, connectionId);
            console.log('Players after reconnect', game.players);
        }

        // Remove guest with those IDs
        // game.removeGuest(connectionId);

        // if (cachedConnectionId) {
        //   game.removeGuest(cachedConnectionId);
        // }

        if (response) {
            console.log('response', response);

            // Send game info to everyone
            this.apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
            await this.gameMessageService.sendGameInfoToAllPlayers(game);
            console.log('Message sent to all players!');

            // Send re-connected player
            const payload = {
                action: 'reJoinGame',
                body: {
                    reConnectedPlayerName: response.player.name,
                    players: response.players,
                },
            };

            // setEndpointFromEvent(event);
            await this.apiGatewayWebsocketsService.sendMessageToAllPlayers(game, this.gameRepository, JSON.stringify(payload));
        }

        return response;
    };

    private joinNotStartedGame = async (input: {
        game: Game;
        event: APIGatewayProxyEvent;
        eventBody: { data: { username: string; color: string; } };
    }) => {
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
            console.log(`Player ${newPlayer.color} added!`);
        }

        // // Remove from guests
        // game.removeGuest(newPlayer.id);

        // Send message with players
        const response = { action: 'joinGame', body: game };

        this.apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
        await this.apiGatewayWebsocketsService.sendMessageToAllPlayers(game, this.gameRepository, JSON.stringify(response));
        console.log('Message sent to all players!');
    };
}
