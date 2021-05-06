import { APIGatewayProxyHandler } from 'aws-lambda';

import { APIGatewayWebsocketsService, DynamoDBGameRepository, GameService } from '@src/services';
import { Logger } from '@src/utils';

const localEndpoint = 'http://localhost:3001';

const gameRepository = new DynamoDBGameRepository(process.env.STAGE || 'local');
const apiGatewayWebsocketsService = new APIGatewayWebsocketsService(localEndpoint, process.env.STAGE || 'local');

const gameService = new GameService(gameRepository);

export const getCardHandler: APIGatewayProxyHandler = async (event) => {
    Logger.debug('Get card handler');

    const eventBody = JSON.parse(event.body);
    const { gameId } = eventBody.data;

    const playerId = event.requestContext.connectionId;

    try {
    // Get game
    // const game = await gameService.getGame(gameId);
        const game = await gameRepository.getByID(gameId);
        Logger.debug(`Got game ID ${gameId}`);

        if (!game) {
            Logger.error(`Game ID ${gameId} not found`);

            return {
                statusCode: 400,
                body: JSON.stringify(`Game ID ${gameId} not found`),
            };
        }

        // Get card
        const response = game.getCountryCard(playerId);

        // Update game
        // await gameService.updateGame(game);
        await gameRepository.update(game);
        Logger.debug('Game updated');

        const payload = { action: 'cardReceived', body: { players: response.players } };

        // Send message to that player
        apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
        await apiGatewayWebsocketsService.send(playerId, JSON.stringify(payload));

        const payloadBroadcast = {
            action: 'cardReceived',
            body: {
                playerName: response.player.name,
                round: response.round,
            },
        };

        await apiGatewayWebsocketsService.sendMessageToAllPlayers({
            game,
            gameService,
            data: JSON.stringify(payloadBroadcast),
        });

        Logger.debug('Message sent to all players!');

        return {
            statusCode: 200,
            body: JSON.stringify('moveTroops OK!'),
        };
    } catch (error) {
        Logger.error(error);

        return {
            statusCode: 400,
            body: JSON.stringify(error),
        };
    }
};

export const exchangeCardHandler: APIGatewayProxyHandler = async (event) => {
    Logger.debug('Exchange card handler');

    const eventBody = JSON.parse(event.body);
    const { gameId, card } = eventBody.data;

    const playerId = event.requestContext.connectionId;

    try {
    // Get game
    // const game = await gameService.getGame(gameId);
        const game = await gameRepository.getByID(gameId);
        Logger.debug(`Got game ID ${gameId}`);

        if (!game) {
            Logger.error(`Game ID ${gameId} not found`);

            return {
                statusCode: 400,
                body: JSON.stringify(`Game ID ${gameId} not found`),
            };
        }

        const response = game.exchangeCard(playerId, card);
        Logger.debug('Changed Card');

        // Update game
        // await gameService.updateGame(game);
        await gameRepository.update(game);
        Logger.debug('Game updated');

        const payload = {
            action: 'cardExchanged',
            body: { players: response.players, countries: response.countries },
        };

        // Send message to all player
        apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
        await apiGatewayWebsocketsService.sendMessageToAllPlayers({
            game,
            data: JSON.stringify(payload),
            gameService,
        });
        Logger.debug('Message sent to all players!');
    } catch (error) {
        Logger.error(error);

        return {
            statusCode: 400,
            body: JSON.stringify(error),
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify('moveTroops OK!'),
    };
};

export const exchangeCardsHandler: APIGatewayProxyHandler = async (event) => {
    Logger.debug('Exchange cards handler');

    const eventBody = JSON.parse(event.body);
    const { gameId, cards } = eventBody.data;

    const playerId = event.requestContext.connectionId;

    try {
    // Get game
    // const game = await gameService.getGame(gameId);
        const game = await gameRepository.getByID(gameId);

        if (!game) {
            Logger.error(`Game ID ${gameId} not found`);

            return {
                statusCode: 400,
                body: JSON.stringify(`Game ID ${gameId} not found`),
            };
        }

        Logger.debug(`Got game ID ${gameId}`);

        const response = game.exchangeCards(playerId, cards);
        Logger.debug('Exchanged cards');

        // Update game
        await gameRepository.update(game);
        Logger.debug('Game updated');

        const payload = { action: 'cardsExchanged', body: { players: response.players } };

        // Send message to all player
        apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
        await apiGatewayWebsocketsService.sendMessageToAllPlayers({
            game,
            data: JSON.stringify(payload),
            gameService,
        });
        Logger.debug('Message sent to all players!');

        return {
            statusCode: 200,
            body: JSON.stringify('moveTroops OK!'),
        };
    } catch (error) {
        Logger.error(error);

        return {
            statusCode: 400,
            body: JSON.stringify(error),
        };
    }
};
