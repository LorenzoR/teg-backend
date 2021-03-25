import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';

import APIGatewayWebsocketsService from '../services/APIGatewayWebsocketsService';

import DynamoDBGameRepository from '../services/DynamoDBGameRepository';

import Game from '../models/Game';

import { GameHandlerProcessors } from './processors';
import GameMessageService from '../services/GameMessageService';

const ActionTypes = {
    TROOPS_ADDED: 'troopsAdded',
    ROUND_FINISHED: 'roundFinished',
};

// const gameService = new GameService(new DynamoDBOffline(process.env.STAGE || 'local'));
// const gameService = new GameService(new DynamoDBOffline('local'));

const localEndpoint = 'http://localhost:3001';

const apiGatewayWebsocketsService = new APIGatewayWebsocketsService(localEndpoint, process.env.STAGE || 'local');

// const gameRepository = new GameRepository(process.env.STAGE || 'local');
const gameRepository = new DynamoDBGameRepository(process.env.STAGE || 'local');

const gameMessageService = new GameMessageService({ apiGatewayWebsocketsService, gameRepository });

export const newGameHandler: APIGatewayProxyHandler = async (event) => {
    const newGameId = Game.generateNewGameUUID();

    try {
        const game = new Game();
        game.UUID = newGameId;

        await gameRepository.insert(game);

        return {
            statusCode: 200,
            body: JSON.stringify({ newGameId }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        };
    } catch (error) {
        console.log('Event: ', event);
        console.error(error);

        return {
            statusCode: 400,
            body: JSON.stringify(error),
        };
    }
};

export const joinGameHandler: APIGatewayProxyHandler = async (event) => {
    const gameHandlerProcessors = new GameHandlerProcessors({ gameRepository, apiGatewayWebsocketsService, gameMessageService });

    return gameHandlerProcessors.joinGameHandler(event);
};

export const startGameHandler: APIGatewayProxyHandler = async (event) => {
    console.log('Start Game handler');

    const eventBody = JSON.parse(event.body);
    const { gameId } = eventBody.data;

    try {
        // const game = await gameService.getGame(gameId);
        const game = await gameRepository.getByID(gameId);

        if (!game) {
            console.error(`Game ID ${gameId} not found`);

            return {
                statusCode: 400,
                body: JSON.stringify(`Game ID ${gameId} not found`),
            };
        }

        game.startGame();
        console.log('Game started!');

        // Update game
        await gameRepository.update(game);
        console.log('Game updated');

        // const response = { action: 'gameStarted', body: game };

        apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
        // await sendMessageToAllPlayers(game, JSON.stringify(response));
        await gameMessageService.sendGameInfoToEachPlayer(game);
        console.log('Message sent to all players!');

        // Send connection ID to each player
        await gameMessageService.sendConnectionIdToEachPlayer(gameId);

        return {
            statusCode: 200,
            body: JSON.stringify('startGameHandler OK!'),
        };
    } catch (error) {
        console.error(error);

        return {
            statusCode: 400,
            body: JSON.stringify(error),
        };
    }
};

export const finishRoundHandler: APIGatewayProxyHandler = async (event) => {
    console.log('Finish round handler');

    const eventBody = JSON.parse(event.body);
    const { gameId, playerColor } = eventBody.data;

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

        console.log(`Got game ${gameId}`);

        // Finish round
        try {
            game.finishTurn(playerId);
        } catch (error) {
            console.error('finishRoundHandler error', error);

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

        console.log(`Player ${playerColor} finished his turn`);

        // Get game
        // const response = await gameService.updateGame(game);
        const response = await gameRepository.update(game);
        console.log('Game updated');

        const message = { action: ActionTypes.ROUND_FINISHED, body: response };

        apiGatewayWebsocketsService.setEndpointFromLambdaEvent(event);
        await apiGatewayWebsocketsService.sendMessageToAllPlayers(game, gameRepository, JSON.stringify(message));
        console.log('Message sent to all players!');

        return {
            statusCode: 200,
            body: JSON.stringify('finish turn OK!'),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 400,
            body: JSON.stringify(error),
        };
    }
};
