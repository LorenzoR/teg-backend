import _ from 'lodash';

import Game from '../../src/models/Game';
import Player from '../../src/models/Player';

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

let game: Game;

describe('game model', () => {
  it('can generate a random game ID', async () => {
    expect.hasAssertions();

    const randomGameId = Game.generateNewGameUUID();

    expect(typeof randomGameId).toBe('string');
    expect(randomGameId !== null).toBe(true);
  });

  it('can create a new game', async () => {
    expect.hasAssertions();

    game = Object.assign(new Game(),
      {
        UUID: '1234',
        guests: [],
        players: [],
        countries: null,
        round: null,
        eventsLog: [],
        gameStatus: null,
        countryCards: null,
        winner: null,
      });

    expect(game.UUID).toBe('1234');
  });

  it('can add guest to a game', async () => {
    expect.hasAssertions();

    game.addGuest(guests[0].id);
    game.addGuest(guests[1].id);

    expect(game.guests).toHaveLength(guests.length);
    expect(game.guests[0].id).toBe(guests[0].id);
    expect(game.guests[1].id).toBe(guests[1].id);
  });

  it('can remove guest from a game', async () => {
    expect.hasAssertions();

    const response = game.removeGuest('20');

    expect(response.guests).toHaveLength(1);
    expect(response.guests[0].id).toBe('10');
  });

  it('can add player to a game', async () => {
    expect.hasAssertions();

    game.addPlayer(Object.assign(new Player(), players[0]));
    game.addPlayer(Object.assign(new Player(), players[1]));
    game.addPlayer(Object.assign(new Player(), players[2]));

    expect(game.players).toHaveLength(players.length);
    expect(game.players[0].id).toBe(players[0].id);
    expect(game.players[1].id).toBe(players[1].id);
    expect(game.players[2].id).toBe(players[2].id);
  });

  it('can remove player from a game', async () => {
    expect.hasAssertions();

    const response = game.removePlayer('2');

    expect(response.id).toBe('2');
  });

  it('can get online players and guests', async () => {
    expect.hasAssertions();

    const onlinePlayers = game.getOnlinePlayersAndGuests();

    expect(onlinePlayers).toHaveLength(3);
  });

  it('can start a game', async () => {
    expect.hasAssertions();

    game.startGame();
    expect(game.gameStatus).toBe('started');
    expect(game.countries[0].state.troops).toBe(1);
    expect(game.round.playerIndex).toBe(0);
    expect(game.countryCards).toHaveLength(50);
  });

  it('can count countries for each player', async () => {
    expect.hasAssertions();

    // Add troops to country
    const countries = Game.getCountriesByPlayer(game.countries, players[0].color);

    expect(countries).toHaveLength(25);
    expect(countries[0].state.player.color).toBe(players[0].color);
    expect(countries[24].state.player.color).toBe(players[0].color);
  });

  it('can count troops to add for each player', async () => {
    expect.hasAssertions();

    const troopsPerPlayer = Game.calculateTroopsToAdd(game.players, game.countries);
    expect(troopsPerPlayer[players[0].color].free).toBe(12);
    expect(troopsPerPlayer[players[2].color].free).toBe(12);
  });

  it('can count troops to add for each player with continent bonus', async () => {
    expect.hasAssertions();

    // Assign south america to player 1
    [(_.find(game.countries, { countryKey: 'ARGENTINA' })).state.player] = players;
    [(_.find(game.countries, { countryKey: 'BRASIL' })).state.player] = players;
    [(_.find(game.countries, { countryKey: 'COLOMBIA' })).state.player] = players;
    [(_.find(game.countries, { countryKey: 'CHILE' })).state.player] = players;
    [(_.find(game.countries, { countryKey: 'PERU' })).state.player] = players;
    [(_.find(game.countries, { countryKey: 'URUGUAY' })).state.player] = players;

    const troopsPerPlayer = Game.calculateTroopsToAdd(game.players, game.countries);

    expect(troopsPerPlayer[players[0].color].SOUTH_AMERICA).toBe(3);
  });

  it('can not add troops to country if it belongs to another player', async () => {
    expect.hasAssertions();

    const countryKey = 'BRASIL';

    // Assign country to player
    [{ color: (_.find(game.countries, { countryKey })).state.player.color }] = game.players;

    // Set round to add troops
    game.round.type = 'addTroops';
    game.round.playerIndex = 1;

    const newTroops = 4;
    const errorMsg = `Country ${countryKey} does not belong to ${game.players[1].color}`;

    expect(() => game.addTroops(game.players[1].id, countryKey, newTroops)).toThrow(errorMsg);
  });

  it('can add troops to country', async () => {
    expect.hasAssertions();

    // Assign country to player
    const countryKey = 'BRASIL';
    const country = _.find(game.countries, { countryKey });

    [{ color: country.state.player.color }] = game.players;

    // Set round to add troops
    game.round.type = 'addTroops';
    game.round.playerIndex = 0;

    const newTroops = 4;
    game.addTroops(game.players[0].id, countryKey, newTroops);

    const expectedTroops = country.state.troops + country.state.newTroops;
    expect(expectedTroops).toBe(newTroops + 1);
  });

  it('can remove troops from country', async () => {
    expect.hasAssertions();

    // Assign country to player
    const countryKey = 'BRASIL';
    const country = _.find(game.countries, { countryKey });
    [{ color: country.state.player.color }] = game.players;

    // Set round to add troops
    game.round.type = 'addTroops';

    const troopsToRemove = 4;
    game.addTroops(game.players[0].id, countryKey, -troopsToRemove);
    expect(country.state.troops).toBe(1);
  });

  it('can not attack with just one troop', async () => {
    expect.hasAssertions();

    // Assign country to player 1
    const attackerKey = 'BRASIL';
    const attacker = _.find(game.countries, { countryKey: attackerKey });
    attacker.state.player = { color: game.players[0].color };

    // Assign country to player 2
    const defenderKey = 'ARGENTINA';
    const defender = _.find(game.countries, { countryKey: defenderKey });
    defender.state.player = { color: game.players[1].color };

    const errorMsg = 'Attacker needs at least 2 troops to attack';

    // Set round to attack
    game.round.type = 'attack';

    expect(() => game.attack(game.players[0].id, attackerKey, defenderKey)).toThrow(errorMsg);
  });

  it('can not attack if country belongs to someone else', async () => {
    expect.hasAssertions();

    const attackerKey = 'BRASIL';
    const defenderKey = 'ARGENTINA';
    const playerColor = game.players[1].color;
    const errorMsg = `Country ${attackerKey} does not belong to ${playerColor}`;

    // Set round to add troops
    game.round.type = 'addTroops';
    game.round.playerIndex = 1;

    // Add troops to country
    const attacker = _.find(game.countries, { countryKey: attackerKey });
    attacker.state.player = { color: game.players[0].color };
    attacker.state.troops = 10;

    // Set country to player 3
    const defender = _.find(game.countries, { countryKey: defenderKey });
    defender.state.player = { color: game.players[1].color };

    // Set round to attack
    game.round.type = 'attack';

    expect(() => game.attack(game.players[1].id, attackerKey, defenderKey)).toThrow(errorMsg);
  });

  it('can not attack from invalid country', async () => {
    expect.hasAssertions();

    const attackerKey = 'INVALID_COUNTRY';
    const defenderKey = 'ARGENTINA';

    // Set round to add troops
    game.round.type = 'addTroops';
    game.round.playerIndex = 0;

    // Set defender to player 3
    const defender = _.find(game.countries, { countryKey: defenderKey });
    [, { color: defender.state.player.color }] = game.players;

    // Set round to attack
    game.round.type = 'attack';

    const errorMsg = `Country ${attackerKey} not found`;

    expect(() => game.attack(game.players[0].id, attackerKey, defenderKey)).toThrow(errorMsg);
  });

  it('can not attack to invalid country', async () => {
    expect.hasAssertions();

    const attackerKey = 'BRASIL';
    const defenderKey = 'INVALID_COUNTRY';

    // Set round to add troops
    game.round.type = 'addTroops';
    game.round.playerIndex = 0;

    // Set attacker to player 1
    const attacker = _.find(game.countries, { countryKey: attackerKey });
    attacker.state.player = { color: game.players[0].color };

    // Add troops to country
    attacker.state.troops = 4;

    // Set round to attack
    game.round.type = 'attack';

    const errorMsg = `Country ${defenderKey} not found`;

    expect(() => game.attack(game.players[0].id, attackerKey, defenderKey)).toThrow(errorMsg);
  });

  it('can attack country with random dices', async () => {
    expect.hasAssertions();

    const attackerKey = 'BRASIL';
    const defenderKey = 'ARGENTINA';

    // Set round to add troops
    game.round.type = 'addTroops';
    game.round.playerIndex = 0;

    // Set attacker to player 1
    const attacker = _.find(game.countries, { countryKey: attackerKey });
    attacker.state.player = { color: game.players[0].color };

    // Add troops to country
    attacker.state.troops = 4;

    // Set defender to player 3
    const defender = _.find(game.countries, { countryKey: defenderKey });
    defender.state.player = { color: game.players[1].color };

    // Set round to attack
    game.round.type = 'attack';

    const response = game.attack(game.players[0].id, attackerKey, defenderKey);

    expect(response.dices.attacker).toHaveLength(3);
    expect(response.dices.defender).toHaveLength(1);
  });

  it('can attack country and win', async () => {
    expect.hasAssertions();

    const attackerKey = 'BRASIL';
    const defenderKey = 'ARGENTINA';

    // Set round to add troops
    game.round.type = 'addTroops';
    game.round.playerIndex = 0;

    // Set attacker to player 1
    const attacker = _.find(game.countries, { countryKey: attackerKey });
    attacker.state.player = { color: game.players[0].color };

    // Add troops to country
    attacker.state.troops = 4;

    // Set defender to player 3
    const defender = _.find(game.countries, { countryKey: defenderKey });
    defender.state.player = { color: game.players[1].color };

    // Set round to attack
    game.round.type = 'attack';

    const dices = { attacker: [6, 6, 6], defender: [1, 1, 1] };
    const response = game.attack(game.players[0].id, attackerKey, defenderKey, dices);

    expect(response.dices.attacker).toHaveLength(3);
    expect(response.dices.defender).toHaveLength(1);

    expect(response.countryConquered).toBe(true);
    expect(response.defender.state.player.color).toBe(game.players[0].color);
  });

  it('can attack country and lose', async () => {
    expect.hasAssertions();

    const attackerKey = 'BRASIL';
    const defenderKey = 'ARGENTINA';

    // Set round to add troops
    game.round.type = 'addTroops';
    game.round.playerIndex = 0;

    // Set attacker to player 1
    const attacker = _.find(game.countries, { countryKey: attackerKey });
    attacker.state.player = { color: game.players[0].color };

    // Add troops to country
    attacker.state.troops = 4;

    // Set defender to player 3
    const defender = _.find(game.countries, { countryKey: defenderKey });
    defender.state.player = { color: game.players[1].color };

    // Set round to attack
    game.round.type = 'attack';

    const dices = { attacker: [1, 1, 1], defender: [6, 6, 6] };
    const response = game.attack(game.players[0].id, attackerKey, defenderKey, dices);

    expect(response.dices.attacker).toHaveLength(3);
    expect(response.dices.defender).toHaveLength(1);

    expect(response.countryConquered).toBe(false);
    expect(response.defender.state.player.color).toBe(game.players[1].color);
  });

  it('can finish round', async () => {
    expect.hasAssertions();

    // TODO. Add more players so game can't finish in second round
    const response1 = game.finishTurn(game.players[0].id);
    expect(response1.UUID).toBe(gameId);
    // expect(response1.round.playerIndex).toBe(1);

    const response2 = game.finishTurn(game.players[1].id);
    expect(response2.UUID).toBe(gameId);
    // expect(response2.round.playerIndex).toBe(0);
  });

  it('can move troops', async () => {
    expect.hasAssertions();

    const sourceKey = 'AUSTRALIA';
    const targetKey = 'BORNEO';
    const troopsToMove = 3;
    const addedTroops = 3;

    // Set round to add troops
    game.round.type = 'addTroops';
    game.round.playerIndex = 0;

    // Set source to player 1 and add troops to country
    const source = _.find(game.countries, { countryKey: sourceKey });
    [{ color: source.state.player.color }] = game.players;
    source.state.troops = addedTroops + 1;

    // Set target to player 1
    const target = _.find(game.countries, { countryKey: targetKey });
    [{ color: target.state.player.color }] = game.players;

    // Add troops to country
    game.addTroops(game.players[0].id, sourceKey, addedTroops);

    // Set round to attack
    game.round.type = 'attack';

    const response = game.moveTroops(game.players[0].id, sourceKey, targetKey, troopsToMove, false);

    expect(response.source.state.troops).toBe(addedTroops - troopsToMove + 1);
    expect(response.target.state.troops + response.target.state.newTroops).toBe(1 + troopsToMove);
  });

  it('can not move troops if target and source are the same', async () => {
    expect.hasAssertions();

    const sourceKey = 'AUSTRALIA';
    const targetKey = sourceKey;
    const troopsToMove = 3;
    const addedTroops = 3;

    // Set round to add troops
    // game.round.type = 'addTroops';
    game.round.playerIndex = 0;

    // Set source to player 1 and add troops to country
    const source = _.find(game.countries, { countryKey: sourceKey });
    [{ color: source.state.player.color }] = game.players;
    source.state.troops = addedTroops + 1;

    // Add free troops to add
    // game.players[0].troopsToAdd.free =

    // Set target to player 1
    const target = _.find(game.countries, { countryKey: targetKey });
    [{ color: target.state.player.color }] = game.players;

    // Add troops to country
    // game.addTroops(game.players[0].id, sourceKey, addedTroops);

    // Set round to attack
    game.round.type = 'attack';

    const errorMsg = 'Source and target can not be the same';

    expect(() => game.moveTroops(game.players[0].id, sourceKey, targetKey, troopsToMove, false)).toThrow(errorMsg);
  });

  it('can exchange three cards', async () => {
    expect.hasAssertions();

    let player = _.find(game.players, (obj) => obj.color === game.players[0].color);

    const freeTroopsToAdd = player.troopsToAdd.free;

    // Set round to player 1
    game.round.type = 'addTroops';
    game.round.playerIndex = 0;

    // Add some cards to player 1
    const cards = ['ARGENTINA', 'IRAN', 'URUGUAY'];
    game.players[0].cards.push({ country: cards[0] });
    game.players[0].cards.push({ country: cards[1] });
    game.players[0].cards.push({ country: cards[2] });

    // Remove 3 cards from deck
    _.remove(game.countryCards, (obj) => obj.country === cards[0]);
    _.remove(game.countryCards, (obj) => obj.country === cards[1]);
    _.remove(game.countryCards, (obj) => obj.country === cards[2]);

    // Exchange cards
    const response = game.exchangeCards(game.players[0].id, cards);

    player = _.find(response.players, (obj) => obj.color === game.players[0].color);

    expect(player.cardExchangesCount).toBe(1);
    expect(player.troopsToAdd.free).toBe(freeTroopsToAdd + 4);
    expect(player.cards).toHaveLength(0);
  });

  it('can get a card', async () => {
    expect.hasAssertions();

    const response = game.getCountryCard(game.players[0].id);

    const player = _.find(game.players, (obj) => obj.color === game.players[0].color);
    const { newCard } = response;

    expect(newCard).toHaveProperty('country');
    expect(game.countryCards).toHaveLength(50 - 1);
    expect(player.cards).toHaveLength(1);
    // Check card is not in the deck any more
    expect(_.find(game.countryCards, (obj) => obj.country === newCard.country)).toBeUndefined();
  });

  it('can exchange one card', async () => {
    expect.hasAssertions();

    // Get player 1 cards
    let player = _.find(game.players, (obj) => obj.color === game.players[0].color);
    const { cards } = player;

    // Assign a country to player 1
    [{ color: (_.find(game.countries, { countryKey: cards[0].country })).state.player.color }] = game.players;

    const country = _.find(game.countries, { countryKey: cards[0].country });
    const troopbsBeforeExchange = country.state.newTroops + country.state.troops;

    // Exchange card
    const response = game.exchangeCard(player.id, cards[0].country);

    // const { countries } = game;
    // const country = _.find(countries, (obj) => obj.countryKey === cards[0].country);

    player = _.find(response.players, (obj) => obj.color === game.players[0].color);

    expect(player.cards[0].exchanged).toBe(true);
    expect(country.state.newTroops + country.state.troops).toBe(troopbsBeforeExchange + 2);
  });

  it('can re-connect player', async () => {
    expect.hasAssertions();

    const response = game.reConnectPlayer('red', '100');

    expect(response.player.color).toBe('red');
  });
});
