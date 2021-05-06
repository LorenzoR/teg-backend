import { Game } from '@src/models';
import { GameService } from '../GameService';
// import DynamoDBOffline from '../DynamoDBOffline';
import { DynamoDBGameRepository } from '../DynamoDBGameRepository';

const gameRepository = new DynamoDBGameRepository('local');
const gameService = new GameService(gameRepository);

const gameId = Game.generateNewGameUUID();

describe('games service', () => {
    it('can create a new game', async () => {
        expect.hasAssertions();

        const newGame = await gameService.newGame(gameId);
        expect(newGame.UUID).toBe(gameId);
    });

    it('can get a game', async () => {
        expect.hasAssertions();

        const game = await gameService.getGame(gameId);
        expect(game.UUID).toBe(gameId);
    });

    it('can scan games', async () => {
        expect.hasAssertions();

        const games = await gameService.scanGames();
        expect(games.length).toBeGreaterThan(0);
    });

    it('can delete a game', async () => {
        expect.hasAssertions();

        const response = await gameService.deleteGame(gameId);
        expect(response).toBe(true);
    });
});
