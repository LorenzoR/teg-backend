import _ from 'lodash';

import Game from '../../src/models/Game';
import Player from '../../src/models/Player';
import Country from '../../src/models/Country';

import DynamoDBGameRepository from '../../src/services/DynamoDBGameRepository';

const dynamoDBGameRepository = new DynamoDBGameRepository(process.env.NODE_ENV);

const gameId = '1234';

const players = [
  {
    id: '1',
    name: 'player 1',
    color: 'red',
    troopsToAdd: { free: 15 },
    isAdmin: true,
    cards: [],
    canGetCard: false,
    cardExchangesCount: 0,
  },
  {
    id: '2',
    name: 'player 2',
    color: 'blue',
    troopsToAdd: { free: 15 },
    isAdmin: false,
    cards: [],
    canGetCard: false,
    cardExchangesCount: 0,
  },
  {
    id: '3',
    name: 'player 3',
    color: 'black',
    troopsToAdd: { free: 15 },
    isAdmin: false,
    cards: [],
    canGetCard: false,
    cardExchangesCount: 0,
  },
];

describe('dynamoDB mapper wrapper service', () => {
  it('can create a game', async () => {
    expect.hasAssertions();

    const game = new Game();
    game.UUID = gameId;
    game.addPlayer(Object.assign(new Player(), players[0]));
    game.addPlayer(Object.assign(new Player(), players[1]));

    game.startGame();

    const response = await dynamoDBGameRepository.insert(game);

    expect(response).toBe(true);
  });

  it('can get a game', async () => {
    expect.hasAssertions();

    const game = JSON.parse(JSON.stringify(await dynamoDBGameRepository.getByID(gameId)));

    const attacker = Object.assign(new Country(), game.countries[0]);
    const defender = Object.assign(new Country(), game.countries[1]);

    expect(game.UUID).toBe(gameId);
    expect(game.players[0].playerStatus).toBe('online');
    expect(attacker.state.troops).toBe(1);
    expect(attacker.canAttack(defender)).toBe(false);
  });

  it('can update a game', async () => {
    expect.hasAssertions();

    const newGameStatus = 'finished';
    const game = await dynamoDBGameRepository.getByID(gameId);
    game.gameStatus = newGameStatus;

    const updateResponse = await dynamoDBGameRepository.update(game);

    expect(updateResponse.gameStatus).toBe(newGameStatus);
  });

  it('can add troops', async () => {
    expect.hasAssertions();

    const game = await dynamoDBGameRepository.getByID(gameId);

    const player = game.players[game.round.playerIndex];

    const countryIndex = _.findIndex(game.countries, (obj) => obj.state.player.color === player.color);
    game.countries[countryIndex] = Object.assign(new Country(), game.countries[countryIndex]);

    const response = game.addTroops(player.id, game.countries[countryIndex].countryKey, 1);

    expect(response.state.newTroops).toBe(1);
  });

  it('can delete a game', async () => {
    expect.hasAssertions();

    const response = await dynamoDBGameRepository.delete(gameId);

    expect(response).toBe(true);
  });
});
