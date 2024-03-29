import { APIGatewayProxyHandler } from 'aws-lambda';

import DynamoDBGameRepository from '../services/DynamoDBGameRepository';
import APIGatewayWebsocketsService from '../services/APIGatewayWebsocketsService';

const localEndpoint = 'http://localhost:3001';

const gameRepository = new DynamoDBGameRepository(process.env.STAGE || 'local');
const apiGatewayWebsocketsService = new APIGatewayWebsocketsService(localEndpoint, process.env.STAGE || 'local');

export const getPlayersHandler: APIGatewayProxyHandler = async (event) => {
    // Add player to game
    const eventBody = JSON.parse(event.body);

    const { gameId } = eventBody.data;
    const { connectionId } = event.requestContext;

    try {
        // Get game
        // const game = await gameService.getGame(gameId);
        console.log(`Trying to get game with ID ${gameId}`);

        if (!gameId || gameId === 'undefined') {
            const msg = 'No game ID in event body';
            console.log(msg);
            return {
                statusCode: 200,
                body: JSON.stringify(msg),
            };
        }

        const game = await gameRepository.getByID(gameId);

        if (!game) {
            const msg = `No game with ID ${gameId}`;
            console.log(msg);
            return {
                statusCode: 400,
                body: JSON.stringify(msg),
            };
        }

        // Ping all players to make sure who is online
        const pingPayload = { action: 'ping', body: { } };
        apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
        await apiGatewayWebsocketsService.sendMessageToAllPlayers(game, gameRepository, JSON.stringify(pingPayload));

        // Get current player
        // const { players, guests, gameStatus } = game;
        const { gameStatus } = game;

        /*
    let currentPlayer = _.find(players, (obj) => obj.id === connectionId);

    // Player not found, try in guests
    if (!currentPlayer) {
      currentPlayer = _.find(guests, (obj) => obj.id === connectionId);
    }
    */
        // const currentPlayer = game.getPlayerOrGuestById(connectionId);
        const currentPlayer = game.getPlayerById(connectionId);

        // Error. Player not found
        if (!currentPlayer) {
            const errorMsg = `Player ID ${connectionId} not found in game ${gameId}`;
            console.error(errorMsg);

            return {
                statusCode: 400,
                body: JSON.stringify(errorMsg),
            };
        }

        // Send message to that connectionID only
        const response = {
            action: 'playersInfo',
            body: { currentPlayer, gameStatus, players: game.players },
        };
        // setEndpointFromEvent(event);
        await apiGatewayWebsocketsService.send(connectionId, JSON.stringify(response));

        return {
            statusCode: 200,
            body: JSON.stringify('getGame OK!'),
        };
    } catch (error) {
        console.error(error);

        return {
            statusCode: 400,
            body: JSON.stringify(error),
        };
    }
};
