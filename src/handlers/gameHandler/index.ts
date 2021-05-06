import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';
import {
    APIGatewayWebsocketsService, DynamoDBGameRepository, GameMessageService,
    GameRepositoryInterface, GameMessageServiceInterface, GameService,
} from '@src/services';
import { Logger } from '@src/utils';
import { GameHandlerProcessors } from './processor';

// const gameService = new GameService(new DynamoDBOffline(process.env.STAGE || 'local'));
// const gameService = new GameService(new DynamoDBOffline('local'));

const localEndpoint = 'http://localhost:3001';

const apiGatewayWebsocketsService = new APIGatewayWebsocketsService(localEndpoint, process.env.STAGE || 'local');

// const gameRepository = new GameRepository(process.env.STAGE || 'local');
const gameRepository = new DynamoDBGameRepository(process.env.STAGE || 'local');
const gameService = new GameService(gameRepository);

const gameMessageService = new GameMessageService({ apiGatewayWebsocketsService, gameRepository });

const gameHandlerProcessors = new GameHandlerProcessors({ gameService, apiGatewayWebsocketsService, gameMessageService });

export const dependencies: {
    gameRepository: GameRepositoryInterface;
    gameMessageService: GameMessageServiceInterface;
} = {
    gameRepository,
    gameMessageService,
};

export const newGameHandler: APIGatewayProxyHandler = async (event) => {
    Logger.debug('New Game Handler', event);
    return gameHandlerProcessors.newGameHandler(event);
};

export const joinGameHandler: APIGatewayProxyHandler = async (event) => {
    Logger.debug('Join Game Handler', event);
    return gameHandlerProcessors.joinGameHandler(event);
};

export const startGameHandler: APIGatewayProxyHandler = async (event) => {
    Logger.debug('Start Game handler', event);
    return gameHandlerProcessors.startGameHandler(event);
};

export const finishRoundHandler: APIGatewayProxyHandler = async (event) => {
    Logger.debug('Finish round handler', event);
    return gameHandlerProcessors.finishRoundHandler(event);
};
