import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';

import DynamoDBGameRepository from '../services/DynamoDBGameRepository';
import APIGatewayWebsocketsService from '../services/APIGatewayWebsocketsService';
import WebSocketConnectionRepository from '../services/DynamoDBWebSocketConnectionsRepository';

import WebSocketConnection from '../models/WebSocketConnection';
import Game, { GameStatusType } from '../models/Game';

const localEndpoint = 'http://localhost:3001';

const gameRepository = new DynamoDBGameRepository(process.env.STAGE || 'local');
const apiGatewayWebsocketsService = new APIGatewayWebsocketsService(localEndpoint, process.env.STAGE || 'local');

const webSocketConnectionRepository = new WebSocketConnectionRepository(
    process.env.STAGE || 'local',
);

const getGameIdFromEvent = (event: APIGatewayProxyEvent): string => event.queryStringParameters.game_id;

// TODO. Refactor
const sendGameInfoToAllPlayers = async (game: Game): Promise<boolean> => {
    // const game = await gameService.getGame(gameId);
    // const game = await gameRepository.getByID(gameId);
    // const connectionIds = [];

    if (!game) {
        return null;
    }

    console.log('sending game info to players');
    const promises = [];

    game.players.forEach((player) => {
    // connectionIds.push(player.id);
    // const playerCopy = { ...player };
    // const players = { ...game.players };

        const payload = { action: 'sync', body: { ...game, currentPlayerId: player.id } };

        promises.push(apiGatewayWebsocketsService.send(player.id, JSON.stringify(payload)));
    });

    try {
        await Promise.all(promises);
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
};

export const connectHandler: APIGatewayProxyHandler = async (event) => {
    console.log('Connect Handler');

    const { connectionId } = event.requestContext;
    const isNewGame = false;

    // Add to guests so we have the connection ID
    const gameId = getGameIdFromEvent(event);
    console.log(`Trying to get game ID ${gameId}`);

    // Add connection
    const newConnection = new WebSocketConnection();
    newConnection.gameId = gameId;
    newConnection.connectionId = connectionId;
    await webSocketConnectionRepository.insert(newConnection);

    try {
    // Get players from game
        const game = await gameRepository.getByID(gameId);

        // Check game exists
        if (!game) {
            /*
      console.log(`Game not found, creating game ID ${gameId}`);
      // game = await gameService.newGame(gameId);
      game = (new Game()).initGame();
      game.UUID = gameId;
      isNewGame = true;
      console.log(`Created game ID ${gameId}`);
      */

            console.error(`Game ${gameId} not found`);

            return {
                statusCode: 400,
                body: JSON.stringify(`Game ${gameId} not found`),
            };
        }

        console.log(`Got game ID ${gameId}`);

        /*
    // Add guest
    game.addGuest(event.requestContext.connectionId);
    console.log(`Added guest ${event.requestContext.connectionId} to game ID ${gameId}`);
    */
        // Add player to game
        game.addPlayerWithoutColor(event.requestContext.connectionId);

        // Update game
        if (isNewGame) {
            await gameRepository.insert(game);
        } else {
            await gameRepository.update(game);
        }

        return {
            statusCode: 200,
            body: JSON.stringify('connected'),
        };
    } catch (error) {
        console.error(error);

        return {
            statusCode: 400,
            body: JSON.stringify(error),
        };
    }
};

export const reConnectHandler: APIGatewayProxyHandler = async (event) => {
    // Re-connect player to game
    const eventBody = JSON.parse(event.body);

    const { gameId, color, cachedConnectionId } = eventBody.data;
    const { connectionId } = event.requestContext;

    try {
        const game = await gameRepository.getByID(gameId);

        if (!game) {
            console.error(`Game ID ${gameId} not found`);

            return {
                statusCode: 400,
                body: JSON.stringify(`Game ID ${gameId} not found`),
            };
        }

        let response;

        // Try to get game
        if (cachedConnectionId) {
            console.log('cached!');

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
            console.log('response', response);

            // Update game
            await gameRepository.update(game);
            // await gameService.updateGame(game);

            // Send game info to everyone
            apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
            await sendGameInfoToAllPlayers(game);
            console.log('message sent to all players!');

            // Send re-connected player
            const payload = {
                action: 'reJoinGame',
                body: {
                    reConnectedPlayerName: response.player.name,
                    players: response.players,
                },
            };

            apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
            await apiGatewayWebsocketsService.sendMessageToAllPlayers(game, gameRepository, JSON.stringify(payload));
        }

        return {
            statusCode: 200,
            body: JSON.stringify('reConnectHandler OK!'),
        };
    } catch (error) {
        console.error(error);

        return {
            statusCode: 400,
            body: JSON.stringify(error),
        };
    }
};

export const disconnectHandler: APIGatewayProxyHandler = async (event) => {
    console.log('Disconnect handler');

    const { connectionId } = event.requestContext;
    const webSocketConection = await webSocketConnectionRepository.getById(connectionId);

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
        await webSocketConnectionRepository.delete(connectionId);

        // Get game
        const game = await gameRepository.getByID(gameId);

        let payload;
        let isAdmin = false;

        // If game has started, send message
        if (game && game.gameStatus === GameStatusType.STARTED) {
            // const player = _.find(game.guests, (obj) => obj.id === playerId);

            // Remove from players
            const removedPlayer = game.removePlayer(playerId);
            // const removedPlayer = await gameService.removePlayer(gameId, playerId);
            console.log('Players Removed!', removedPlayer);

            // Update game
            // await gameService.updateGame(game);
            await gameRepository.update(game);
            console.log('Game updated');

            const payloadBody = { players: game.players, disconnectedPlayerName: removedPlayer.name };
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
                console.error(`Player ${playerId} not found`);

                return {
                    statusCode: 400,
                    body: JSON.stringify(`Player ${playerId} not found`),
                };
            }

            // Remove from guests
            // game.removeGuest(playerId);
            // console.log(`Guest ${playerId} removed!`);

            isAdmin = player.isAdmin;

            const removedPlayer = game.removePlayer(playerId);
            // const removedPlayer = await gameService.removePlayer(gameId, playerId);
            console.log('Player Removed!', removedPlayer);

            // Update game only if player was not admin
            // If player is admin game will be removed so no need to update
            if (!isAdmin) {
                // await gameService.updateGame(game);
                await gameRepository.update(game);
                console.log('Game updated');
            }

            const payloadBody = { isAdmin };
            payload = { action: 'guestDisconnected', body: payloadBody };

            // setEndpointFromEvent(event);
            // await sendMessageToAllPlayers(gameId, JSON.stringify(payload));
        }

        apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
        await apiGatewayWebsocketsService.sendMessageToAllPlayers(game, gameRepository, JSON.stringify(payload));
        console.log('Message sent', payload);

        // If admin left, delete game
        if (isAdmin) {
            await gameRepository.delete(gameId);
            // await gameService.deleteGame(gameId);
        }

        return {
            statusCode: 200,
            body: JSON.stringify('disconnected'),
        };
    } catch (error) {
        console.error(error);

        return {
            statusCode: 400,
            body: JSON.stringify(error),
        };
    }
};
