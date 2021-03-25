import { APIGatewayProxyHandler } from 'aws-lambda';

import DynamoDBGameRepository from '../services/DynamoDBGameRepository';
import APIGatewayWebsocketsService from '../services/APIGatewayWebsocketsService';

const localEndpoint = 'http://localhost:3001';

const gameRepository = new DynamoDBGameRepository(process.env.STAGE || 'local');
const apiGatewayWebsocketsService = new APIGatewayWebsocketsService(localEndpoint, process.env.STAGE || 'local');

export const getCardHandler: APIGatewayProxyHandler = async (event) => {
    console.log('Get card handler');

    const eventBody = JSON.parse(event.body);
    const { gameId } = eventBody.data;

    const playerId = event.requestContext.connectionId;

    try {
    // Get game
    // const game = await gameService.getGame(gameId);
        const game = await gameRepository.getByID(gameId);
        console.log(`Got game ID ${gameId}`);

        if (!game) {
            console.error(`Game ID ${gameId} not found`);

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
        console.log('Game updated');

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

        // TODO. Remove?
        apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
        await apiGatewayWebsocketsService.sendMessageToAllPlayers(game, gameRepository, JSON.stringify(payloadBroadcast));
        console.log('Message sent to all players!');

        return {
            statusCode: 200,
            body: JSON.stringify('moveTroops OK!'),
        };
    } catch (error) {
        console.error(error);

        return {
            statusCode: 400,
            body: JSON.stringify(error),
        };
    }
};

export const exchangeCardHandler: APIGatewayProxyHandler = async (event) => {
    console.log('Exchange card handler');

    const eventBody = JSON.parse(event.body);
    const { gameId, card } = eventBody.data;

    const playerId = event.requestContext.connectionId;

    try {
    // Get game
    // const game = await gameService.getGame(gameId);
        const game = await gameRepository.getByID(gameId);
        console.log(`Got game ID ${gameId}`);

        if (!game) {
            console.error(`Game ID ${gameId} not found`);

            return {
                statusCode: 400,
                body: JSON.stringify(`Game ID ${gameId} not found`),
            };
        }

        const response = game.exchangeCard(playerId, card);
        console.log('Changed Card');

        // Update game
        // await gameService.updateGame(game);
        await gameRepository.update(game);
        console.log('Game updated');

        const payload = {
            action: 'cardExchanged',
            body: { players: response.players, countries: response.countries },
        };

        // Send message to all player
        apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
        await apiGatewayWebsocketsService.sendMessageToAllPlayers(game, gameRepository, JSON.stringify(payload));
        console.log('Message sent to all players!');
    } catch (error) {
        console.error(error);

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
    console.log('Exchange cards handler');

    const eventBody = JSON.parse(event.body);
    const { gameId, cards } = eventBody.data;

    const playerId = event.requestContext.connectionId;

    try {
    // Get game
    // const game = await gameService.getGame(gameId);
        const game = await gameRepository.getByID(gameId);

        if (!game) {
            console.error(`Game ID ${gameId} not found`);

            return {
                statusCode: 400,
                body: JSON.stringify(`Game ID ${gameId} not found`),
            };
        }

        console.log(`Got game ID ${gameId}`);

        const response = game.exchangeCards(playerId, cards);
        console.log('Exchanged cards');

        // Update game
        await gameRepository.update(game);
        console.log('Game updated');

        const payload = { action: 'cardsExchanged', body: { players: response.players } };

        // Send message to all player
        apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
        await apiGatewayWebsocketsService.sendMessageToAllPlayers(game, gameRepository, JSON.stringify(payload));
        console.log('Message sent to all players!');

        return {
            statusCode: 200,
            body: JSON.stringify('moveTroops OK!'),
        };
    } catch (error) {
        console.error(error);

        return {
            statusCode: 400,
            body: JSON.stringify(error),
        };
    }
};
