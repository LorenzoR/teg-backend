import { Game, Player } from '@src/models';
import { GameService } from '../../../services/GameService';
import { APIGatewayWebsocketsServiceMock } from '../../../testing/mocks/APIGatewayWebsocketsServiceMock';
import { GameMessageServiceMock } from '../../../testing/mocks/GameMessageServiceMock';
import { GameRepositoryMock } from '../../../testing/mocks/GameRepositoryMock';
import { GameHandlerProcessors } from '../processor';
import { finishRoundHandlerEvent, joinGameHandlerEvent } from './data';

let gameId: string;
let game: Game;

const connectionIds = [
    'ckht5rd0g0003njic1vnh5im0',
    'ckht5rd0g0003njic1vnh5im1',
    'ckht5rd0g0003njic1vnh5im2',
];

const userNames = [
    'user1',
    'user2',
    'user3',
];

const colors = [
    'blue',
    'red',
    'green',
];

describe('game handler processor', () => {
    const gameRepositoryMock = new GameRepositoryMock();
    const gameService = new GameService(gameRepositoryMock);
    const apiGatewayWebsocketsServiceMock = new APIGatewayWebsocketsServiceMock();
    const gameMessageServiceMock = new GameMessageServiceMock();

    const gameHandlerProcessors = new GameHandlerProcessors({
        gameService,
        apiGatewayWebsocketsService: apiGatewayWebsocketsServiceMock,
        gameMessageService: gameMessageServiceMock,
    });

    it('can process new game handler succesfully', async () => {
        expect.hasAssertions();

        const event = joinGameHandlerEvent(gameId, connectionIds[0], userNames[0], 'blue');

        const result = await gameHandlerProcessors.newGameHandler(event);

        expect(result).toBeDefined();
        expect(result.statusCode).toBe(200);
        expect(result.body).toBeDefined();

        const body: { newGameId: string } = JSON.parse(result.body);
        expect(body.newGameId).toBeDefined();
        expect(typeof body.newGameId).toBe('string');

        gameId = body.newGameId;
    });

    it('can throw errors when processing new game handler', async () => {
        expect.hasAssertions();

        const event = joinGameHandlerEvent(gameId, connectionIds[0], userNames[0], 'blue');

        const newGameBackup = gameService.newGame;

        gameService.newGame = (): Promise<Game | null> => null;

        let result = await gameHandlerProcessors.newGameHandler(event);
        expect(result).toStrictEqual({ body: 'Error creating game', statusCode: 400 });

        const errorMsg = 'error';
        gameService.newGame = (): Promise<Game | null> => { throw new Error(errorMsg); };

        result = await gameHandlerProcessors.newGameHandler(event);
        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body)).toBe(errorMsg);

        gameService.newGame = newGameBackup;
    });

    // eslint-disable-next-line jest/no-commented-out-tests
    /*
    it('can process join game handler when game has not started succesfully', async () => {
        expect.hasAssertions();

        const playerColor = 'blue';
        const event = joinGameHandlerEvent(gameId, connectionIds[0], userNames[0], playerColor);

        const result = await gameHandlerProcessors.joinGameHandler(event);

        expect(result).toBeDefined();
        expect(result.statusCode).toBe(200);
        expect(result.body).toBeDefined();

        const body: { action: string; body: Game; } = JSON.parse(result.body);
        const game: Game = body.body;
        expect(game).toBeDefined();
        expect(game.UUID).toBeDefined();
        expect(game.players?.length).toBe(1);
        expect(game.players[0].color).toBe(playerColor);
        expect(game.players[0].id).toBe(connectionIds[0]);
    });
    */

    it('can process join game handler when game has not started for 3 players', async () => {
        expect.hasAssertions();

        const event1 = joinGameHandlerEvent(gameId, connectionIds[0], userNames[0], colors[0]);
        await gameHandlerProcessors.joinGameHandler(event1);

        const event2 = joinGameHandlerEvent(gameId, connectionIds[1], userNames[1], colors[1]);
        await gameHandlerProcessors.joinGameHandler(event2);

        const event3 = joinGameHandlerEvent(gameId, connectionIds[2], userNames[2], colors[2]);
        const result = await gameHandlerProcessors.joinGameHandler(event3);

        expect(result).toBeDefined();
        expect(result.statusCode).toBe(200);
        expect(result.body).toBeDefined();

        const body: { action: string; body: Game; } = JSON.parse(result.body);
        expect(body.body).toBeDefined();
        expect(body.body.UUID).toBeDefined();
        expect(body.body.players?.length).toBe(3);
        expect(body.body.players[0].color).toBe(colors[0]);
        expect(body.body.players[0].id).toBe(connectionIds[0]);
        expect(body.body.players[1].color).toBe(colors[1]);
        expect(body.body.players[1].id).toBe(connectionIds[1]);
        expect(body.body.players[2].color).toBe(colors[2]);
        expect(body.body.players[2].id).toBe(connectionIds[2]);
    });

    it('can throw error when processing join game handler', async () => {
        expect.hasAssertions();

        const event = joinGameHandlerEvent(gameId, connectionIds[0], userNames[0], 'blue');

        const getGameBackup = gameService.getGame;

        gameService.getGame = (): Promise<Game | null> => null;

        let result = await gameHandlerProcessors.joinGameHandler(event);
        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toBe(`Game ID ${gameId} not found`);

        const errorMsg = 'error';
        gameService.newGame = (): Promise<Game | null> => { throw new Error(errorMsg); };

        result = await gameHandlerProcessors.newGameHandler(event);
        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body)).toBe(errorMsg);

        gameService.getGame = getGameBackup;
    });

    it('can process start game handler', async () => {
        expect.hasAssertions();

        const event1 = joinGameHandlerEvent(gameId, connectionIds[0], userNames[0], colors[0]);
        const result = await gameHandlerProcessors.startGameHandler(event1);

        expect(result).toBeDefined();
        expect(result.statusCode).toBe(200);
        expect(result.body).toBeDefined();

        game = JSON.parse(result.body);
        expect(game).toBeDefined();
        expect(game.UUID).toBeDefined();
        expect(game.players?.length).toBe(3);
        expect(game.players.some((o) => o.id === connectionIds[0])).toBe(true);
        expect(game.players.some((o) => o.id === connectionIds[1])).toBe(true);
        expect(game.players.some((o) => o.color === colors[0])).toBe(true);
        expect(game.players.some((o) => o.color === colors[1])).toBe(true);
        game.players.forEach((o) => {
            expect(o.troopsToAdd).toStrictEqual({ free: 5 });
        });
        expect(game.countries?.length).toBe(50);
        expect(game.countries.some((o) => o.name === 'ARGENTINA')).toBe(true);
        expect(game.round).toStrictEqual({
            count: 1,
            type: 'firstAddTroops',
            playerIndex: 0,
            gotCard: false,
        });
    });

    it('can process join game handler with a started game', async () => {
        expect.hasAssertions();

        const event = joinGameHandlerEvent(gameId, connectionIds[0], userNames[0], colors[0]);
        const result = await gameHandlerProcessors.joinGameHandler(event);

        expect(result).toBeDefined();
        expect(result.statusCode).toBe(200);
        expect(result.body).toBeDefined();

        const body: { player: Player; players: Player[]; } = JSON.parse(result.body);

        expect(body.players?.length).toBe(3);
        expect(body.players.some((o) => o.id === connectionIds[0])).toBe(true);
        expect(body.players.some((o) => o.id === connectionIds[1])).toBe(true);
        expect(body.players.some((o) => o.color === colors[0])).toBe(true);
        expect(body.players.some((o) => o.color === colors[1])).toBe(true);
        expect(body.player.id).toBe(connectionIds[0]);
        expect(body.player.name).toBe(userNames[0]);
        expect(body.player.color).toBe(colors[0]);
    });

    it('can process join finish round handler', async () => {
        expect.hasAssertions();

        const expectedRounds = [
            {
                count: 1,
                type: 'firstAddTroops',
                playerIndex: 1,
                gotCard: false,
            },
            {
                count: 1,
                type: 'firstAddTroops',
                playerIndex: 2,
                gotCard: false,
            },
            {
                count: 1,
                type: 'secondAddTroops',
                playerIndex: 0,
                gotCard: false,
            },
            {
                count: 1,
                type: 'secondAddTroops',
                playerIndex: 1,
                gotCard: false,
            },
            {
                count: 1,
                type: 'secondAddTroops',
                playerIndex: 2,
                gotCard: false,
            },
            {
                count: 1,
                type: 'attack',
                playerIndex: 0,
                gotCard: false,
            },
            {
                count: 1,
                type: 'attack',
                playerIndex: 1,
                gotCard: false,
            },
            {
                count: 1,
                type: 'attack',
                playerIndex: 2,
                gotCard: false,
            },
            {
                count: 2,
                type: 'addTroops',
                playerIndex: 0,
                gotCard: false,
            },
            {
                count: 2,
                type: 'addTroops',
                playerIndex: 1,
                gotCard: false,
            },
            {
                count: 2,
                type: 'addTroops',
                playerIndex: 2,
                gotCard: false,
            },
            {
                count: 2,
                type: 'attack',
                playerIndex: 0,
                gotCard: false,
            },
        ];

        let currentPlayer = game.players[game.round.playerIndex];
        let event = finishRoundHandlerEvent(gameId, currentPlayer.id, currentPlayer.color);
        let result = await gameHandlerProcessors.finishRoundHandler(event);

        expect(result).toBeDefined();
        expect(result.statusCode).toBe(200);
        expect(result.body).toBeDefined();

        let body: Game = JSON.parse(result.body);

        expect(body.players?.length).toBe(3);
        expect(body.players.some((o) => o.id === connectionIds[0])).toBe(true);
        expect(body.players.some((o) => o.id === connectionIds[1])).toBe(true);
        expect(body.players.some((o) => o.id === connectionIds[2])).toBe(true);
        expect(body.players.some((o) => o.color === colors[0])).toBe(true);
        expect(body.players.some((o) => o.color === colors[1])).toBe(true);
        expect(body.players.some((o) => o.color === colors[2])).toBe(true);

        for (let i = 0; i < expectedRounds.length; i += 1) {
            const round = expectedRounds[i];
            expect(body.round).toStrictEqual(round);
            currentPlayer = body.players[body.round.playerIndex];
            event = finishRoundHandlerEvent(gameId, currentPlayer.id, currentPlayer.color);
            // eslint-disable-next-line no-await-in-loop
            result = await gameHandlerProcessors.finishRoundHandler(event);
            body = JSON.parse(result.body);
        }

        /*
        expectedRounds.forEach(async (round) => {
            expect(body.round).toStrictEqual(round);
            currentPlayer = body.players[body.round.playerIndex];
            event = finishRoundHandlerEvent(gameId, currentPlayer.id, currentPlayer.color);
            result = await gameHandlerProcessors.finishRoundHandler(event);
            body = JSON.parse(result.body);
        });
        */
    });

    it('can throw error when processing join finish round handler with wrong player', async () => {
        expect.hasAssertions();

        game = await gameService.getGame(gameId);

        const nextPlayerIndex = (game.round.playerIndex + 1) % 2;
        const nextPlayer = game.players[nextPlayerIndex];

        const event = finishRoundHandlerEvent(gameId, nextPlayer.id, nextPlayer.color);
        const result = await gameHandlerProcessors.finishRoundHandler(event);

        expect(result).toBeDefined();
        expect(result.statusCode).toBe(400);
        expect(result.body).toBeDefined();

        const body = JSON.parse(result.body);
        expect(body).toBe(`Not player ${nextPlayer.color} turn`);
    });

    it('can delete a game', async () => {
        expect.hasAssertions();

        const result = await gameService.deleteGame(gameId);

        expect(result).toBeDefined();
        expect(result).toBe(true);
    });
});
