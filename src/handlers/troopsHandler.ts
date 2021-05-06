import { APIGatewayProxyHandler } from 'aws-lambda';

import { DynamoDBGameRepository, GameService, APIGatewayWebsocketsService } from '@src/services';
import { Logger } from '@src/utils';

const localEndpoint = 'http://localhost:3001';

const gameRepository = new DynamoDBGameRepository(process.env.STAGE || 'local');
const gameService = new GameService(gameRepository);
const apiGatewayWebsocketsService = new APIGatewayWebsocketsService(localEndpoint, process.env.STAGE || 'local');

/*
const setEndpointFromEvent = (event): void => {
    if (event.requestContext.domainName !== 'localhost') {
        endpoint = `${event.requestContext.domainName}/${event.requestContext.stage}`;
        apiGatewayWebsocketsService.setEndpoint(endpoint);
        Logger.debug('endpoint', endpoint);
    }
};
*/

const ActionTypes = {
    TROOPS_ADDED: 'troopsAdded',
    ROUND_FINISHED: 'roundFinished',
};

export const addTroopsHandler: APIGatewayProxyHandler = async (event) => {
    Logger.debug('Add troops handler');

    const eventBody = JSON.parse(event.body);
    const {
        gameId, country, count, playerColor,
    } = eventBody.data;

    const playerId = event.requestContext.connectionId;

    // Get game
    // const game = await gameService.getGame(gameId);
    try {
        const game = await gameRepository.getByID(gameId);
        Logger.debug(`Got game ${game.UUID} for player ID ${playerId}`);

        game.addTroops(playerId, country, count);

        Logger.debug(`Player ${playerColor} added ${count} troops to ${country}`);

        // Update game
        // const response = await gameService.updateGame(game);
        const response = await gameRepository.update(game);
        Logger.debug('game updated!');
        // const response = await gameService.updateCountry(gameId, game.countries[country]);
        // Logger.debug('Country updated!');

        const message = { action: ActionTypes.TROOPS_ADDED, body: game.getGame() };

        apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
        await apiGatewayWebsocketsService.sendMessageToAllPlayers({
            game,
            data: JSON.stringify(message),
            gameService,
        });
        Logger.debug('Message sent to all players!');

        return {
            statusCode: 200,
            body: JSON.stringify(response),
        };
    } catch (error) {
        Logger.error(error);

        // Send error message
        const errorPayload = { action: 'error', body: { errorMsg: error.message } };
        // Send message to that player
        apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
        await apiGatewayWebsocketsService.send(playerId, JSON.stringify(errorPayload));

        return {
            statusCode: 400,
            body: JSON.stringify(error),
        };
    }
};

export const moveTroopsHandler: APIGatewayProxyHandler = async (event) => {
    Logger.debug('Move Troops handler');

    const eventBody = JSON.parse(event.body);
    const {
        gameId, playerColor, source, target, count, countryConquered,
    } = eventBody.data;

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

        const response = game.moveTroops(playerId, source, target, count, countryConquered);
        Logger.debug(`Player ${playerColor} moved ${count} troops from ${source} to ${target}`);

        // await gameService.updateGame(game);
        await gameRepository.update(game);
        Logger.debug('Game updated');

        const message = { action: 'troopsMoved', body: response };

        apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
        await apiGatewayWebsocketsService.sendMessageToAllPlayers({
            game,
            data: JSON.stringify(message),
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

export const attackHandler: APIGatewayProxyHandler = async (event) => {
    Logger.debug('Attack handler');

    const eventBody = JSON.parse(event.body);
    const {
        gameId, playerColor, attacker, defender,
    } = eventBody.data;

    // Check if it's that player's round
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

        // Attack
        const attackResponse = game.attack(playerId, attacker, defender);
        Logger.debug(`Player ${playerColor} attacked ${defender} from ${attacker}`);
        Logger.debug(`${attackResponse.dices.attacker} vs ${attackResponse.dices.defender}`);

        // Update game
        await gameRepository.update(game);
        Logger.debug('Game updated');

        const message = { action: 'countryAttacked', body: attackResponse };

        apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
        await apiGatewayWebsocketsService.sendMessageToAllPlayers({
            game,
            data: JSON.stringify(message),
            gameService,
        });
        Logger.debug('Message sent to all players!');

        return {
            statusCode: 200,
            body: JSON.stringify('addTroops OK!'),
        };
    } catch (error) {
        Logger.error(error);

        // Send error message
        const errorPayload = { action: 'error', body: { errorMsg: error.message } };
        // Send message to that player
        apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
        await apiGatewayWebsocketsService.send(playerId, JSON.stringify(errorPayload));

        return {
            statusCode: 400,
            body: JSON.stringify(error),
        };
    }
};
