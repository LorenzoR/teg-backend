import { v4 as uuidv4 } from 'uuid';
import { Game } from '@src/models';
import { GameService } from '@src/services/GameService';
import WebSocketConnection from '@src/models/WebSocketConnection';
import { APIGatewayWebsocketsServiceMock } from '../../../testing/mocks/APIGatewayWebsocketsServiceMock';
import { GameMessageServiceMock } from '../../../testing/mocks/GameMessageServiceMock';
import { GameRepositoryMock } from '../../../testing/mocks/GameRepositoryMock';
import { DynamoDBWebSocketConnectionsRepositoryMock } from '../../../testing/mocks/DynamoDBWebSocketConnectionsRepositoryMock';
import { ConnectionHandlerProcessors } from '../processor';
import { connectHandlerEvent } from './data';
import { gameThreePlayers } from '../../../testing/data';

const gameId = new Date().getTime().toString();

const connectionIds = [
    'ckht5rd0g0003njic1vnh5im0',
    'ckht5rd0g0003njic1vnh5im1',
    'ckht5rd0g0003njic1vnh5im2',
    'ckht5rd0g0003njic1vnh5im3',
];

describe('connection handler processor', () => {
    const gameRepositoryMock = new GameRepositoryMock();
    const gameService = new GameService(gameRepositoryMock);
    const apiGatewayWebsocketsServiceMock = new APIGatewayWebsocketsServiceMock();
    const gameMessageServiceMock = new GameMessageServiceMock();
    const webSocketConnectionRepository = new DynamoDBWebSocketConnectionsRepositoryMock();

    const connectionHandlerProcessors = new ConnectionHandlerProcessors({
        gameService,
        apiGatewayWebsocketsService: apiGatewayWebsocketsServiceMock,
        gameMessageService: gameMessageServiceMock,
        webSocketConnectionRepository,
    });

    // eslint-disable-next-line jest/no-hooks
    beforeAll(async () => {
        await gameService.newGame(gameId);
    });

    // eslint-disable-next-line jest/no-hooks
    afterAll(async () => {
        await gameService.deleteGame(gameId);
    });

    it('can process connect handler succesfully', async () => {
        expect.hasAssertions();

        for (let index = 0; index < connectionIds.length; index += 1) {
            const event = connectHandlerEvent(gameId, connectionIds[index], '');

            // eslint-disable-next-line no-await-in-loop
            const result = await connectionHandlerProcessors.connectHandler(event);

            expect(result).toBeDefined();
            expect(result.statusCode).toBe(200);
            expect(result.body).toBeDefined();

            const game: Game = JSON.parse(result.body);
            expect(game.UUID).toBe(gameId);
            expect(game.players).toHaveLength(index + 1);
            expect(game.players[index].id).toBe(connectionIds[index]);
            expect(game.players[index].color).toBeUndefined();
            expect(game.players[index].isAdmin).toBe(index === 0);
            expect(game.players[index].playerStatus).toBe('online');
        }
    });

    it('can process disconnect handler succesfully when game has not started', async () => {
        expect.hasAssertions();

        const connectionId = connectionIds[1];
        const event = connectHandlerEvent(gameId, connectionId, '');

        const result = await connectionHandlerProcessors.disconnectHandler(event);

        expect(result).toBeDefined();
        expect(result.statusCode).toBe(200);
        expect(result.body).toBeDefined();

        const game: Game = JSON.parse(result.body);
        expect(game.UUID).toBe(gameId);
        expect(game.players).toHaveLength(connectionIds.length - 1);
        expect(game.players.find((o) => o.id === connectionId)).toBeUndefined();
    });

    it('can process disconnect handler succesfully when game has started', async () => {
        expect.hasAssertions();

        const connectionId = gameThreePlayers.players[1].id;
        const testGameId = gameThreePlayers.UUID;

        const websocketConnection = Object.assign(new WebSocketConnection(), {
            connectionId,
            gameId: testGameId,
        });
        await webSocketConnectionRepository.insert(websocketConnection);
        await gameRepositoryMock.insert(Object.assign(new Game(), gameThreePlayers));

        const event = connectHandlerEvent(testGameId, connectionId, '');

        const result = await connectionHandlerProcessors.disconnectHandler(event);

        expect(result).toBeDefined();
        expect(result.statusCode).toBe(200);
        expect(result.body).toBeDefined();

        const game: Game = JSON.parse(result.body);
        expect(game.UUID).toBe(testGameId);
        expect(game.players).toHaveLength(gameThreePlayers.players.length);
        expect(game.players.find((o) => o.id === connectionId).playerStatus).toBe('offline');
        expect(game.players.find((o) => o.id === gameThreePlayers.players[0].id).playerStatus).toBe('online');
        expect(game.players.find((o) => o.id === gameThreePlayers.players[2].id).playerStatus).toBe('online');
    });

    it('can process re-connect handler succesfully when game has started', async () => {
        expect.hasAssertions();

        const testGameId = gameThreePlayers.UUID;
        let connectionId = uuidv4();
        let playerColor = gameThreePlayers.players[1].color;

        let websocketConnection = Object.assign(new WebSocketConnection(), {
            connectionId,
            gameId: testGameId,
        });
        await webSocketConnectionRepository.insert(websocketConnection);
        await gameRepositoryMock.insert(Object.assign(new Game(), gameThreePlayers));

        // First re-connection
        let event = connectHandlerEvent(testGameId, connectionId, playerColor);
        let result = await connectionHandlerProcessors.reConnectHandler(event);

        expect(result).toBeDefined();
        expect(result.statusCode).toBe(200);
        expect(result.body).toBeDefined();

        let game: Game = JSON.parse(result.body);
        expect(game.UUID).toBe(testGameId);
        expect(game.players).toHaveLength(gameThreePlayers.players.length);
        expect(game.players.find((o) => o.id === gameThreePlayers.players[0].id).playerStatus).toBe('online');
        expect(game.players.find((o) => o.id === gameThreePlayers.players[1].id).playerStatus).toBe('online');
        expect(game.players.find((o) => o.id === gameThreePlayers.players[2].id).playerStatus).toBe('online');

        // Second re-connection
        connectionId = uuidv4();
        playerColor = gameThreePlayers.players[0].color;

        websocketConnection = Object.assign(new WebSocketConnection(), {
            connectionId,
            gameId: testGameId,
        });
        await webSocketConnectionRepository.insert(websocketConnection);
        await gameRepositoryMock.insert(Object.assign(new Game(), gameThreePlayers));

        event = connectHandlerEvent(testGameId, connectionId, playerColor);
        result = await connectionHandlerProcessors.reConnectHandler(event);

        expect(result).toBeDefined();
        expect(result.statusCode).toBe(200);
        expect(result.body).toBeDefined();

        game = JSON.parse(result.body);
        expect(game.UUID).toBe(testGameId);
        expect(game.players).toHaveLength(gameThreePlayers.players.length);
        expect(game.players.find((o) => o.id === gameThreePlayers.players[0].id).playerStatus).toBe('online');
        expect(game.players.find((o) => o.id === gameThreePlayers.players[1].id).playerStatus).toBe('online');
        expect(game.players.find((o) => o.id === gameThreePlayers.players[2].id).playerStatus).toBe('online');
    });
});
