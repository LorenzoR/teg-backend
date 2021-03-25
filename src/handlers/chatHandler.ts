import { APIGatewayProxyHandler } from 'aws-lambda';

import DynamoDBGameRepository from '../services/DynamoDBGameRepository';
import APIGatewayWebsocketsService from '../services/APIGatewayWebsocketsService';

const localEndpoint = 'http://localhost:3001';

const gameRepository = new DynamoDBGameRepository(process.env.STAGE || 'local');

const apiGatewayWebsocketsService = new APIGatewayWebsocketsService(localEndpoint, process.env.STAGE || 'local');

export const chatMessageHandler: APIGatewayProxyHandler = async (event) => {
    console.log('Chat message handler');

    const eventBody = JSON.parse(event.body);
    const {
        gameId, message,
    } = eventBody.data;

    const playerId = event.requestContext.connectionId;

    // Get game
    const game = await gameRepository.getByID(gameId);

    // Get player
    // const player = await gameService.getPlayerById(gameId, playerId);
    const player = game.getPlayerById(playerId);

    // Error. Player not found
    if (!player) {
        const errorMsg = `Player ID ${playerId} not found in game ${gameId}`;
        console.error(errorMsg);

        return {
            statusCode: 400,
            body: JSON.stringify(errorMsg),
        };
    }

    const payload = { action: 'messageReceived', body: { player, message } };

    // Send message to all player
    apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
    await apiGatewayWebsocketsService.sendMessageToAllPlayers(game, gameRepository, JSON.stringify(payload));

    return {
        statusCode: 200,
        body: JSON.stringify('chat Message OK!'),
    };
};
