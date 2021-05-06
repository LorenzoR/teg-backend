// import { connectHandler } from '../../src/handlers/connectionHandler';
import { Game } from '@src/models';
import {
    joinGameHandler, newGameHandler, startGameHandler, finishRoundHandler,
    // dependencies,
} from '../gameHandler';
import {
    newGameEvent, joinGameHandlerEvent, startGameEvent, finishTurnEvent,
} from './data';
// import { GameRepositoryMock } from '../../testing/mocks/GameRepositoryMock';

let gameId: string;
const invalidGameId = 'invalid';
const connectionId = 'ckht5rd0g0003njic1vnh5im0';
const invalidConnectionId = 'invalid';

// const gameRepositoryMock = new GameRepositoryMock();

describe('game handlers', () => {
    // eslint-disable-next-line jest/no-hooks
    beforeEach(async () => {
        await new Promise((r) => setTimeout(r, 1000));
    });

    it('can call newGameHandler', async () => {
        expect.hasAssertions();

        // dependencies.gameRepository = gameRepositoryMock;

        const response = await newGameHandler(newGameEvent, null, null);

        expect(response && response.statusCode).toBe(200);
        expect(response && JSON.parse(response.body).newGameId !== '').toBe(true);
        gameId = JSON.parse(response && response.body).newGameId;
    });

    it('can call joinGameHandler', async () => {
        expect.hasAssertions();

        /*
        const connectEvent = {
            ...newGameEvent,
            queryStringParameters: {
                game_id: gameId,
            },
            requestContext: {
                ...newGameEvent.requestContext,
                connectionId: 'ckht56jkt000j90ic8pdb9975',
            },
        };
        */

        /*
        const connectResponse = await connectHandler(connectEvent(gameId), null, null);

        Logger.debug('connectResponse', connectResponse);

        const event = {
            ...connectEvent,
            body: JSON.stringify({
                data: {
                    gameId,
                    cachedConnectionId: '',
                    color: 'red',
                },
            }),
        };

        Logger.debug(event);
        */

        const response = await joinGameHandler(joinGameHandlerEvent(gameId, connectionId), null, null);

        if (!response) {
            throw new Error('No response');
        }

        expect(response).toBeDefined();
        expect(response.statusCode).toBe(200);

        const responseBody: { action: string; body: Game } = JSON.parse(response.body);
        expect(responseBody.action).toBe('joinGame');

        const game = responseBody.body;
        expect(game.UUID).toBe(gameId);
        expect(game.players).toHaveLength(1);
        expect(game.players[0].id).toBe(connectionId);
        expect(game.players[0].color).toBe('blue');
    });

    it('can start a game', async () => {
        expect.hasAssertions();

        const response = await startGameHandler(startGameEvent(gameId), null, null);

        if (!response) {
            throw new Error('No response');
        }

        expect(response).toBeDefined();
        expect(response.statusCode).toBe(200);

        const game: Game = JSON.parse(response.body);
        expect(game.UUID).toBe(gameId);
        expect(game.players).toHaveLength(1);
        expect(game.players[0].id).toBe(connectionId);
        expect(game.players[0].color).toBe('blue');
    });

    it('can finish a round', async () => {
        expect.hasAssertions();

        const response = await finishRoundHandler(finishTurnEvent(gameId, connectionId), null, null);

        if (!response) {
            throw new Error('No response');
        }

        expect(response).toBeDefined();
        expect(response.statusCode).toBe(200);

        const game: Game = JSON.parse(response.body);
        expect(game.UUID).toBe(gameId);
        expect(game.players).toHaveLength(1);
        expect(game.players[0].id).toBe(connectionId);
        expect(game.players[0].color).toBe('blue');
    });

    it('can throw error when finish a round for invalid game id', async () => {
        expect.hasAssertions();

        const response = await finishRoundHandler(finishTurnEvent(invalidGameId, connectionId), null, null);

        if (!response) {
            throw new Error('No response');
        }

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body)).toBe(`Game ID ${invalidGameId} not found`);
    });

    it('can throw error when finish a round for invalid player id', async () => {
        expect.hasAssertions();

        const response = await finishRoundHandler(finishTurnEvent(gameId, invalidConnectionId), null, null);

        if (!response) {
            throw new Error('No response');
        }

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body)).toBe(`Player ID ${invalidConnectionId} not found`);
    });
});
