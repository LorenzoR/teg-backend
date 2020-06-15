import _ from 'lodash';

import GameService from '../../src/services/GameService';
import DynamoDBOffline from '../../src/services/DynamoDBOffline';

const dynamoDBOffline = new DynamoDBOffline('local');
const gameService = new GameService(dynamoDBOffline);

const gameId = '1234';

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

    const game = await gameService.scanGames();
    expect(game.Count).toBeGreaterThan(0);
  });

  it('can delete a game', async () => {
    expect.hasAssertions();

    const response = await gameService.deleteGame(gameId);
    expect(response).toBe(true);
  });
});
