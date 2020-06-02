import _ from 'lodash';

// eslint-disable-next-line import/extensions
import GameService from '../../src/services/GameService';
// eslint-disable-next-line import/extensions
import DynamoDBOffline from '../../src/services/DynamoDBOffline';
// eslint-disable-next-line import/extensions
import DiceService from '../../src/services/DiceService';

const diceService = new DiceService();
const dynamoDBOffline = new DynamoDBOffline();
const gameService = new GameService(dynamoDBOffline, diceService);

const gameId = '1234';

describe('games service', () => {
  it('can create a new game', async () => {
    expect.hasAssertions();

    const newGame = await gameService.newGame(gameId);
    expect(newGame).toStrictEqual({});
  });

  it('can get a game', async () => {
    expect.hasAssertions();

    const game = await gameService.getGame(gameId);
    expect(game.UUID).toBe(gameId);
  });

  it('can add player to a game', async () => {
    expect.hasAssertions();

    const players = [
      {
        id: '1',
        name: 'player 1',
        color: 'red',
        cards: [],
        canGetCard: false,
        cardExchangesCount: 0,
      },
      {
        id: '2',
        name: 'player 2',
        color: 'blue',
        cards: [],
        canGetCard: false,
        cardExchangesCount: 0,
      },
      {
        id: '3',
        name: 'player 3',
        color: 'black',
        cards: [],
        canGetCard: false,
        cardExchangesCount: 0,
      },
    ];

    await gameService.addPlayer(gameId, players[0]);
    await gameService.addPlayer(gameId, players[1]);
    await gameService.addPlayer(gameId, players[2]);

    const game = await gameService.getGame(gameId);

    expect(game.players).toHaveLength(players.length);
    expect(game.players[0].id).toBe(players[0].id);
    expect(game.players[1].id).toBe(players[1].id);
    expect(game.players[2].id).toBe(players[2].id);
  });

  it('can remove player from a game', async () => {
    expect.hasAssertions();

    const response = await gameService.removePlayer(gameId, '2');

    expect(response.id).toBe('2');
  });

  it('can add guest to a game', async () => {
    expect.hasAssertions();

    const guests = [
      {
        id: '10',
      },
      {
        id: '20',
      },
    ];

    await gameService.addGuest(gameId, guests[0]);
    await gameService.addGuest(gameId, guests[1]);

    const game = await gameService.getGame(gameId);

    expect(game.guests).toHaveLength(guests.length);
    expect(game.guests[0].id).toBe(guests[0].id);
    expect(game.guests[1].id).toBe(guests[1].id);
  });

  it('can remove guest from a game', async () => {
    expect.hasAssertions();

    const response = await gameService.removeGuest(gameId, '20');

    expect(response.guests).toHaveLength(1);
    expect(response.guests[0].id).toBe('10');
  });

  it('can start a game', async () => {
    expect.hasAssertions();

    const game = await gameService.startGame(gameId);
    expect(game.gameStatus).toBe('started');
    expect(game.countries.BRASIL.state.troops).toBe(1);
    expect(game.round.playerIndex).toBe(0);
    expect(game.countryCards).toHaveLength(50);
  });

  it('can add troops to country', async () => {
    expect.hasAssertions();

    const newTroops = 10;
    const response = await gameService.addTroops(gameId, 'BRASIL', newTroops);
    expect(response.countries.BRASIL.state.troops).toBe(newTroops + 1);
  });

  it('can remove troops from country', async () => {
    expect.hasAssertions();

    const troopsToRemove = 10;
    const response = await gameService.addTroops(gameId, 'BRASIL', -troopsToRemove);
    expect(response.countries.BRASIL.state.troops).toBe(1);
  });

  it('can assign country to player', async () => {
    expect.hasAssertions();

    const player = {
      id: '1',
      name: 'player 1',
      color: 'red',
    };
    const countryKey = 'BRASIL';

    const response = await gameService.assignCountryToPlayer(gameId, player, countryKey);
    expect(response.countries[countryKey].state.player.id).toBe(player.id);
  });

  it('can not attack with just one troop', async () => {
    expect.hasAssertions();

    const attacker = 'BRASIL';
    const defender = 'ARGENTINA';
    const playerId = '1';
    const errorMsg = 'Attacker needs at least 2 troops to attack';

    await expect(gameService.attack(gameId, attacker, defender, playerId)).rejects.toThrow(errorMsg);
  });

  it('can not attack if country belongs to someone else', async () => {
    expect.hasAssertions();

    const attacker = 'BRASIL';
    const defender = 'ARGENTINA';
    const playerId = '1';
    const errorMsg = `Country ${attacker} does not belong to ${playerId}`;

    // Add troops to country
    await gameService.addTroops(gameId, attacker, 2);

    // Set country to player 3
    const player = {
      id: '3',
      name: 'player 3',
      color: 'black',
    };

    await gameService.assignCountryToPlayer(gameId, player, attacker);

    await expect(gameService.attack(gameId, attacker, defender, playerId)).rejects.toThrow(errorMsg);
  });

  it('can attack country', async () => {
    expect.hasAssertions();

    const attacker = 'BRASIL';
    const defender = 'ARGENTINA';
    const playerId = '1';

    // Add troops to country
    await gameService.addTroops(gameId, attacker, 2);

    // Set attacker to player 1
    const player1 = {
      id: '1',
      name: 'player 1',
      color: 'red',
    };
    await gameService.assignCountryToPlayer(gameId, player1, attacker);

    // Set defender to player 3
    const player3 = {
      id: '3',
      name: 'player 3',
      color: 'black',
    };
    await gameService.assignCountryToPlayer(gameId, player3, defender);

    const response = await gameService.attack(gameId, attacker, defender, playerId);

    console.log(response);
    expect(response.dices.attacker).toHaveLength(3);
    expect(response.dices.defender).toHaveLength(1);

    // Sort dices ascending to see who won
    const dices = { attacker: [], defender: [] };
    dices.attacker = [...response.dices.attacker].sort((a, b) => b - a);
    dices.defender = [...response.dices.defender].sort((a, b) => b - a);

    // eslint-disable-next-line jest/no-if
    if (dices.attacker[0] > dices.defender[0]) {
      expect(response.countryConquered).toBe(true);
      expect(response.defender.state.player.id).toBe(player1.id);
    } else {
      expect(response.countryConquered).toBe(false);
      expect(response.defender.state.player.id).toBe(player3.id);
    }
  });

  it('can finish round', async () => {
    expect.hasAssertions();

    const response1 = await gameService.finishRound(gameId);
    expect(response1.round.playerIndex).toBe(1);

    const response2 = await gameService.finishRound(gameId);
    expect(response2.round.playerIndex).toBe(0);
  });

  it('can move troops', async () => {
    expect.hasAssertions();

    const source = 'AUSTRALIA';
    const target = 'BORNEO';
    const playerId = '1';
    const troopsToMove = 3;

    // Add troops to country
    await gameService.addTroops(gameId, source, 10);

    // Set source to player 1
    const player1 = {
      id: '1',
      name: 'player 1',
      color: 'red',
    };
    await gameService.assignCountryToPlayer(gameId, player1, source);

    // Set target to player 1
    await gameService.assignCountryToPlayer(gameId, player1, target);

    const response = await gameService.moveTroops(gameId, source, target, playerId, troopsToMove);

    expect(response.source.state.troops).toBe(11 - troopsToMove);
    expect(response.target.state.troops + response.target.state.newTroops).toBe(1 + troopsToMove);
  });

  it('can get a card', async () => {
    expect.hasAssertions();

    const playerId = '1';

    const response = await gameService.getCard(gameId, playerId);

    const player = _.find(response.players, (obj) => obj.id === playerId);
    const card = player.cards[0];

    expect(response.countryCards).toHaveLength(50 - 1);
    expect(player.cards).toHaveLength(1);
    // Check card is not in the deck any more
    expect(_.find(response.countryCards, (obj) => obj.country === card.country)).toBeUndefined();
  });

  it('can re-connect player', async () => {
    expect.hasAssertions();

    const player = await gameService.reConnectPlayer(gameId, 'red', '100');

    expect(player.color).toBe('red');
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
