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

const players = [
  {
    id: '1',
    name: 'player 1',
    color: 'red',
    troopsToAdd: { free: 15 },
    cards: [],
    canGetCard: false,
    cardExchangesCount: 0,
  },
  {
    id: '2',
    name: 'player 2',
    color: 'blue',
    troopsToAdd: { free: 15 },
    cards: [],
    canGetCard: false,
    cardExchangesCount: 0,
  },
  {
    id: '3',
    name: 'player 3',
    color: 'black',
    troopsToAdd: { free: 15 },
    cards: [],
    canGetCard: false,
    cardExchangesCount: 0,
  },
];

const guests = [
  {
    id: '10',
  },
  {
    id: '20',
  },
];

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

    await gameService.addGuest(gameId, guests[0].id);
    await gameService.addGuest(gameId, guests[1].id);

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

  it('can count countries for each player', async () => {
    expect.hasAssertions();

    const game = await gameService.startGame(gameId);

    // Add troops to country
    const countries = GameService.getCountriesByPlayer(game.countries, players[0].color);

    expect(countries).toHaveLength(25);
    expect(countries[0].state.player.color).toBe(players[0].color);
    expect(countries[24].state.player.color).toBe(players[0].color);
  });

  /*
  it('can count countries for each player', async () => {
    expect.hasAssertions();

    const game = await gameService.startGame(gameId);

    // Add troops to country
    const countries = GameService.getCountriesByPlayer(game.countries, players[0].color);

    expect(countries).toHaveLength(25);
    expect(countries[0].state.player.color).toBe(players[0].color);
    expect(countries[24].state.player.color).toBe(players[0].color);
  });
  */

  it('can count troops to add for each player', async () => {
    expect.hasAssertions();

    const game = await gameService.getGame(gameId);

    const troopsPerPlayer = GameService.calculateTroopsToAdd(game.players, game.countries);
    expect(troopsPerPlayer[players[0].color].free).toBe(12);
    expect(troopsPerPlayer[players[2].color].free).toBe(12);
  });

  it('can count troops to add for each player with continent bonus', async () => {
    expect.hasAssertions();

    let game = await gameService.getGame(gameId);

    // Assign south america to player 1
    await gameService.assignCountryToPlayer(gameId, players[0], 'ARGENTINA');
    await gameService.assignCountryToPlayer(gameId, players[0], 'BRASIL');
    await gameService.assignCountryToPlayer(gameId, players[0], 'COLOMBIA');
    await gameService.assignCountryToPlayer(gameId, players[0], 'CHILE');
    await gameService.assignCountryToPlayer(gameId, players[0], 'PERU');
    await gameService.assignCountryToPlayer(gameId, players[0], 'URUGUAY');

    // Get game again
    game = await gameService.getGame(gameId);

    const troopsPerPlayer = GameService.calculateTroopsToAdd(game.players, game.countries);
    console.log('troopsPerPlayer', troopsPerPlayer);
    expect(troopsPerPlayer[players[0].color].SOUTH_AMERICA).toBe(3);
  });

  it('can not add troops to country if it belongs to another player', async () => {
    expect.hasAssertions();

    const countryKey = 'BRASIL';

    const game = await gameService.getGame(gameId);
    const country = _.find(game.countries, (obj) => obj.countryKey === countryKey);

    // Assign country to player
    await gameService.assignCountryToPlayer(gameId, players[1], countryKey);

    // Set round to add troops
    await gameService.setRoundType(gameId, 'addTroops');

    const newTroops = 4;
    const errorMsg = `Country ${countryKey} does not belong to ${players[0].color}`;

    await expect(gameService.addTroops(gameId, players[0].color, countryKey, newTroops)).rejects.toThrow(errorMsg);
  });

  it('can add troops to country', async () => {
    expect.hasAssertions();

    // Assign country to player
    const countryKey = 'BRASIL';
    await gameService.assignCountryToPlayer(gameId, players[0], countryKey);

    // Set round to add troops
    await gameService.setRoundType(gameId, 'addTroops');

    const newTroops = 4;
    const response = await gameService.addTroops(gameId, players[0].color, countryKey, newTroops);
    expect(response.countries.BRASIL.state.troops).toBe(newTroops + 1);
  });

  it('can remove troops from country', async () => {
    expect.hasAssertions();

    // Assign country to player
    const countryKey = 'BRASIL';
    await gameService.assignCountryToPlayer(gameId, players[0], countryKey);

    // Set round to add troops
    await gameService.setRoundType(gameId, 'addTroops');

    const troopsToRemove = 4;
    const response = await gameService.addTroops(gameId, players[0].color, countryKey, -troopsToRemove);
    expect(response.countries.BRASIL.state.troops).toBe(1);
  });

  it('can assign country to player', async () => {
    expect.hasAssertions();

    const countryKey = 'BRASIL';

    const response = await gameService.assignCountryToPlayer(gameId, players[0], countryKey);
    expect(response.countries[countryKey].state.player.id).toBe(players[0].id);
  });

  it('can not attack with just one troop', async () => {
    expect.hasAssertions();

    const attacker = 'BRASIL';
    const defender = 'ARGENTINA';
    const playerColor = players[0].color;
    const errorMsg = 'Attacker needs at least 2 troops to attack';

    // Set round to attack
    await gameService.setRoundType(gameId, 'attack');

    await expect(gameService.attack(gameId, attacker, defender, playerColor)).rejects.toThrow(errorMsg);
  });

  it('can not attack if country belongs to someone else', async () => {
    expect.hasAssertions();

    const attacker = 'BRASIL';
    const defender = 'ARGENTINA';
    const playerColor = players[0].color;
    const errorMsg = `Country ${attacker} does not belong to ${playerColor}`;

    // Set round to add troops
    await gameService.setRoundType(gameId, 'addTroops');

    // Add troops to country
    await gameService.addTroops(gameId, players[0].color, attacker, 2);

    // Set country to player 3
    await gameService.assignCountryToPlayer(gameId, players[2], attacker);

    // Set round to attack
    await gameService.setRoundType(gameId, 'attack');

    await expect(gameService.attack(gameId, attacker, defender, playerColor)).rejects.toThrow(errorMsg);
  });

  it('can attack country', async () => {
    expect.hasAssertions();

    const attacker = 'BRASIL';
    const defender = 'ARGENTINA';

    // Set round to add troops
    await gameService.setRoundType(gameId, 'addTroops');

    // Set attacker to player 1
    await gameService.assignCountryToPlayer(gameId, players[0], attacker);

    // Add troops to country
    await gameService.addTroops(gameId, players[0].color, attacker, 2);

    // Set defender to player 3
    await gameService.assignCountryToPlayer(gameId, players[2], defender);

    // Set round to attack
    await gameService.setRoundType(gameId, 'attack');

    const response = await gameService.attack(gameId, attacker, defender, players[0].color);

    expect(response.dices.attacker).toHaveLength(3);
    expect(response.dices.defender).toHaveLength(1);

    // Sort dices ascending to see who won
    const dices = { attacker: [], defender: [] };
    dices.attacker = [...response.dices.attacker].sort((a, b) => b - a);
    dices.defender = [...response.dices.defender].sort((a, b) => b - a);

    // eslint-disable-next-line jest/no-if
    if (dices.attacker[0] > dices.defender[0]) {
      expect(response.countryConquered).toBe(true);
      expect(response.defender.state.player.id).toBe(players[0].id);
    } else {
      expect(response.countryConquered).toBe(false);
      expect(response.defender.state.player.id).toBe(players[2].id);
    }
  });

  it('can finish round', async () => {
    expect.hasAssertions();

    const response1 = await gameService.finishRound(gameId, players[0].color);
    expect(response1.round.playerIndex).toBe(1);

    const response2 = await gameService.finishRound(gameId, players[2].color);
    expect(response2.round.playerIndex).toBe(0);
  });

  it('can move troops', async () => {
    expect.hasAssertions();

    const source = 'AUSTRALIA';
    const target = 'BORNEO';
    const troopsToMove = 3;
    const addedTroops = 3;

    // Set round to add troops
    await gameService.setRoundType(gameId, 'addTroops');

    // Set source to player 1
    await gameService.assignCountryToPlayer(gameId, players[0], source);

    // Set target to player 1
    await gameService.assignCountryToPlayer(gameId, players[0], target);

    // Add troops to country
    await gameService.addTroops(gameId, players[0].color, source, addedTroops);

    // Set round to attack
    await gameService.setRoundType(gameId, 'attack');

    const response = await gameService.moveTroops(gameId, source, target, players[0].color, troopsToMove, false);

    expect(response.source.state.troops).toBe(addedTroops - troopsToMove + 1);
    expect(response.target.state.troops + response.target.state.newTroops).toBe(1 + troopsToMove);
  });

  it('can exchange three cards', async () => {
    expect.hasAssertions();

    const game = await gameService.getGame(gameId);
    let player = _.find(game.players, (obj) => obj.color === players[0].color);

    const freeTroopsToAdd = player.troopsToAdd.free;

    // Add some cards to player 1
    const cards = ['ARGENTINA', 'IRAN', 'URUGUAY'];
    await gameService.addCountryCardToPlayer(gameId, players[0].color, cards[0]); // Wildcard
    await gameService.addCountryCardToPlayer(gameId, players[0].color, cards[1]);
    await gameService.addCountryCardToPlayer(gameId, players[0].color, cards[2]);

    // Exchange cards
    const response = await gameService.exchangeCards(gameId, players[0].color, cards);

    player = _.find(response.players, (obj) => obj.color === players[0].color);

    expect(player.cardExchangesCount).toBe(1);
    expect(player.troopsToAdd.free).toBe(freeTroopsToAdd + 4);
    expect(player.cards).toHaveLength(0);
  });

  it('can get a card', async () => {
    expect.hasAssertions();

    const response = await gameService.getCard(gameId, players[0].color);

    const player = _.find(response.players, (obj) => obj.color === players[0].color);
    const card = player.cards[0];

    expect(response.countryCards).toHaveLength(50 - 1);
    expect(player.cards).toHaveLength(1);
    // Check card is not in the deck any more
    expect(_.find(response.countryCards, (obj) => obj.country === card.country)).toBeUndefined();
  });

  it('can exchange one card', async () => {
    expect.hasAssertions();

    // Get player 1 cards
    const game = await gameService.getGame(gameId);
    let player = _.find(game.players, (obj) => obj.color === players[0].color);
    const { cards } = player;

    // Assign a country to player 1
    await gameService.assignCountryToPlayer(gameId, players[0], cards[0].country);

    // Exchange card
    const response = await gameService.exchangeCard(gameId, player.color, cards[0].country);

    const { countries } = response;
    const country = _.find(countries, (obj) => obj.countryKey === cards[0].country);

    player = _.find(response.players, (obj) => obj.color === players[0].color);

    expect(player.cards[0].exchanged).toBe(true);
    expect(country.state.newTroops).toBe(2);
    expect(country.state.troops).toBe(1);
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
