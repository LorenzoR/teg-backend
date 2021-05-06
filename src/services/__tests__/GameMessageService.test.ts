import { Game } from '@src/models';
import { APIGatewayWebsocketsServiceMock } from '@src/testing/mocks/APIGatewayWebsocketsServiceMock';
import { GameRepositoryMock } from '@src/testing/mocks/GameRepositoryMock';
import { GameMessageService } from '../GameMessageService';
import { gameThreePlayers } from '../../testing/data';

const apiGatewayWebsocketsService = new APIGatewayWebsocketsServiceMock();
const gameRepository = new GameRepositoryMock();

const gameMessageService = new GameMessageService({
    apiGatewayWebsocketsService,
    gameRepository,
});

const game: Game = Object.assign(new Game(), gameThreePlayers);
const gameId = game.UUID;

describe('game message service', () => {
    // eslint-disable-next-line jest/no-hooks
    beforeAll(async () => {
        await gameRepository.insert(game);
    });

    // eslint-disable-next-line jest/no-hooks
    afterAll(async () => {
        await gameRepository.delete(gameId);
    });

    it('can send Connection Id To Each Player', async () => {
        expect.hasAssertions();

        const result = await gameMessageService.sendConnectionIdToEachPlayer(gameId);

        expect(result).toBeDefined();
        expect(result).toBe(true);
    });

    it('can send Game Info To All Players', async () => {
        expect.hasAssertions();

        const result = await gameMessageService.sendGameInfoToAllPlayers(game);

        expect(result).toBeDefined();
        expect(result).toBe(true);
    });

    it('can send Game Info To Each Player', async () => {
        expect.hasAssertions();

        const result = await gameMessageService.sendGameInfoToEachPlayer(game);

        expect(result).toBeDefined();
        expect(result).toBe(true);
    });
});
