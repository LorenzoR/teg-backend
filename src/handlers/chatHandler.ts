import { APIGatewayProxyHandler } from 'aws-lambda';

import { APIGatewayWebsocketsService, DynamoDBGameRepository, GameService } from '@src/services';
import { Logger } from '@src/utils';

const localEndpoint = 'http://localhost:3001';

const gameRepository = new DynamoDBGameRepository(process.env.STAGE || 'local');

const gameService = new GameService(gameRepository);

const apiGatewayWebsocketsService = new APIGatewayWebsocketsService(localEndpoint, process.env.STAGE || 'local');

export const chatMessageHandler: APIGatewayProxyHandler = async (event) => {
    Logger.debug('Chat message handler');

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
        Logger.error(errorMsg);

        return {
            statusCode: 400,
            body: JSON.stringify(errorMsg),
        };
    }

    const payload = { action: 'messageReceived', body: { player, message } };

    // Send message to all player
    apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
    await apiGatewayWebsocketsService.sendMessageToAllPlayers({
        game,
        data: JSON.stringify(payload),
        gameService,
    });

    return {
        statusCode: 200,
        body: JSON.stringify('chat Message OK!'),
    };
};
