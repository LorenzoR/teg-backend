/* eslint-disable no-param-reassign */
// import { DynamoDB } from 'aws-sdk';
import _ from 'lodash';

import { Player } from '../models/Player';
// import { Country } from '../models/Country';
import { RoundType } from '../models/Round';

import DealService from './DealService';
import DiceService from './DiceService';
import CountryService from './CountryService';
import MissionService from './MissionService';

import { ContinentTypes } from '../models/Continent';
import CountryCard from '../models/CountryCard';

interface Repository {
  put: any;
  scan: any;
  get: any;
  update: any;
  delete: any;
}

const GameStatusType = {
  WAITING_PLAYERS: 'waitingPlayers',
  STARTED: 'started',
  FINISHED: 'finished',
};

const ContinentBonus = {
  AFRICA: 3,
  EUROPE: 5,
  SOUTH_AMERICA: 3,
  NORTH_AMERICA: 5,
  OCEANIA: 2,
  ASIA: 7,
};

const FIRST_ROUND_TROOPS = 5;
const SECOND_ROUND_TROOPS = 3;

// TODO. Don't hard-code values
const CardExchangesCount = [4, 7, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];

class GameService {
  private repository!: Repository;

  private diceService!: DiceService;

  private MAX_DICES_PER_THROW = 3;

  private GAMES_TABLE_NAME = process.env.GAMES_TABLE || 'teg-games-dev';

  // private dealService!: DealService;

  constructor(repository: any, diceService: DiceService) {
    this.repository = repository;
    this.diceService = diceService;
    console.log('GAMES_TABLE_NAME', this.GAMES_TABLE_NAME);
    // this.dealService = dealService;
    /*
    this.repository = new DynamoDB.DocumentClient({
      region: 'localhost',
      endpoint: 'http://localhost:8000',
      accessKeyId: 'DEFAULT_ACCESS_KEY', // needed if you don't have aws credentials at all in env
      secretAccessKey: 'DEFAULT_SECRET', // needed if you don't have aws credentials at all in env
    });
    */
  }

  public async newGame(UUID: string): Promise<boolean> {
    const params = {
      // TableName: this.GAMES_TABLE_NAME,
      Item: {
        UUID,
        players: [],
        currentPlayerId: null,
        gameStatus: GameStatusType.WAITING_PLAYERS,
        round: {
          count: 1,
          type: RoundType.ADD_TROOPS,
          playerIndex: 0,
        },
        eventsLog: [],
      },
    };

    try {
      const response = await this.repository.put(this.GAMES_TABLE_NAME, params);

      if (response) {
        return response;
      }

      // TODO. Handle error
      return false;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  public async addPlayer(UUID: string, player: { id: string; name: string; color: string}): Promise<any> {
    // Get players so we can update
    const game = await this.getGame(UUID);

    // Check if there is a guest with that ID and if it was admin
    let isAdmin = false;
    if (game && game.guests) {
      const guest = _.find(game.guests, (obj) => obj.id === player.id);
      isAdmin = guest && guest.isAdmin ? guest.isAdmin : false;
    }

    const newPlayer = {
      ...player,
      cards: [],
      playerStatus: 'online',
      troopsToAdd: {
        free: FIRST_ROUND_TROOPS,
      },
      canGetCard: false,
      cardExchangesCount: 0,
      isAdmin,
    };

    let players;

    if (game && game.players) {
      players = game.players;
    } else {
      players = [];
    }

    players.push(newPlayer);

    // Add event
    game.eventsLog.unshift({
      time: GameService.getCurrentTimestamp(),
      text: `Player ${player.name} (${player.color}) joined game`,
      type: 'playerAdded',
    });

    const updateExpression = 'set players = :p, eventsLog = :e';
    const expressionAttributeValues = {
      ':p': players,
      ':e': game.eventsLog,
    };

    try {
      const response = await this.repository.update(
        this.GAMES_TABLE_NAME,
        { UUID },
        updateExpression,
        expressionAttributeValues,
      );

      if (response) {
        return response;
      }

      // TODO. Handle error
      return false;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  public async removePlayer(UUID: string, playerId: string): Promise<any> {
    // Get players so we can update
    const game = await this.getGame(UUID);

    let removedPlayer = null;

    if (game && game.players) {
      if (game.gameStatus === GameStatusType.STARTED) {
        // If game has started set status to offline so player can re-connect
        removedPlayer = _.find(game.players, (obj) => obj.id === playerId);
        if (removedPlayer) {
          // removedPlayer.id = null;
          removedPlayer.playerStatus = 'offline';
        }
      } else {
        // If game hasn't started just remove player
        removedPlayer = _.remove(game.players, (obj) => obj.id === playerId);
      }

      console.log('REMOVED PLAYER', removedPlayer);

      const updateExpression = 'set players = :p';
      const expressionAttributeValues = {
        ':p': game.players,
      };

      try {
        const response = await this.repository.update(
          this.GAMES_TABLE_NAME,
          { UUID },
          updateExpression,
          expressionAttributeValues,
        );

        if (response) {
          // ID is unique so array should have one element only
          return removedPlayer && removedPlayer.length ? removedPlayer[0] : removedPlayer;
        }

        // TODO. Handle error
        return false;
      } catch (error) {
        console.log(error);
        return false;
      }
    }

    return true;
  }

  public async getPlayerById(UUID: string, playerId: string): Promise<any> {
    const game = await this.getGame(UUID);

    if (!game || !game.players) {
      return false;
    }

    // Find by color
    return _.find(game.players, (obj) => obj.id === playerId);
  }

  public async getPlayerByColor(UUID: string, color: string): Promise<any> {
    const game = await this.getGame(UUID);

    if (!game || !game.players) {
      return false;
    }

    // Find by color
    return _.find(game.players, (obj) => obj.color === color);
  }

  public async reConnectPlayer(
    UUID: string,
    color: string,
    id: string,
  ): Promise<any> {
    const game = await this.getGame(UUID);

    if (!game || !game.players) {
      return false;
    }

    // Find player by color
    const { players } = game;
    const player = _.find(players, (obj) => obj.color === color);

    if (!player) {
      return false;
    }

    // Update ID and status
    player.id = id;
    player.playerStatus = 'online';

    // Update game
    try {
      const updateExpression = 'set players = :p';
      const expressionAttributeValues = {
        ':p': players,
      };
      const response = await this.repository.update(
        this.GAMES_TABLE_NAME,
        { UUID },
        updateExpression,
        expressionAttributeValues,
      );

      if (response) {
        return { player, players };
        // ID is unique to array should have one element only
        // return game;
      }

      // TODO. Handle error
      return false;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  public async addGuest(UUID: string, guestId: string): Promise<any> {
    // Get players so we can update
    const game = await this.getGame(UUID);

    // Check if there is already a player with that ID
    if (game && game.players && _.find(game.players, (obj) => obj.id === guestId)) {
      return null;
    }

    let guests;

    const guest = { id: guestId, isAdmin: false };

    if (game && game.guests) {
      guests = game.guests;
    } else {
      guests = [];
      guest.isAdmin = true;
    }

    guests.push(guest);

    const updateExpression = 'set guests = :g';
    const expressionAttributeValues = {
      ':g': guests,
    };

    try {
      const response = await this.repository.update(
        this.GAMES_TABLE_NAME,
        { UUID },
        updateExpression,
        expressionAttributeValues,
      );

      if (response) {
        return response;
      }

      // TODO. Handle error
      return false;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  public async removeGuest(UUID: string, guestId: string): Promise<any> {
    if (!UUID || !guestId) {
      return null;
    }

    // Get players so we can update
    const game = await this.getGame(UUID);

    if (game && game.guests) {
      _.remove(game.guests, (obj) => obj.id === guestId);

      // If waiting for players and there is only one guest, make it admin
      if (game.guests && game.guests.length === 1 && game.gameStatus === GameStatusType.WAITING_PLAYERS) {
        const guest = game.guests[0];
        guest.isAdmin = true;
      }

      const updateExpression = 'set guests = :g';
      const expressionAttributeValues = {
        ':g': game.guests,
      };

      try {
        const response = await this.repository.update(
          this.GAMES_TABLE_NAME,
          { UUID },
          updateExpression,
          expressionAttributeValues,
        );

        if (response) {
          return response;
        }

        // TODO. Handle error
        return false;
      } catch (error) {
        console.log(error);
        return false;
      }
    }

    return true;
  }

  public async startGame(UUID: string): Promise<any> {
    const game = await this.getGame(UUID);

    if (!game) {
      // TODO. Handle error
      return false;
    }

    // Set first round
    const round = {
      count: 1,
      type: RoundType.FIRST_ADD_TROOPS,
      playerIndex: 0,
    };

    // Troops to add
    game.players.forEach((player) => {
      // eslint-disable-next-line no-param-reassign
      player.troopsToAdd = { free: FIRST_ROUND_TROOPS };
    });

    // Add countries and missions
    const countriesAndMissions = DealService.dealCountriesAndMissions(
      game.players,
    );

    // Country cards
    const countryCards = DealService.dealCountryCards();

    // Set status to STARTED
    const gameStatus = GameStatusType.STARTED;

    // Remove guests
    game.guests = [];

    // Add event
    game.eventsLog.unshift({
      time: GameService.getCurrentTimestamp(),
      text: 'Game started',
      type: 'gameStarted',
    });

    // Update game
    const updateExpression = 'set players = :p, countries= :c, round= :r, gameStatus= :s, countryCards= :cc, guests = :g, eventsLog = :e';
    const expressionAttributeValues = {
      ':p': countriesAndMissions.players,
      ':c': countriesAndMissions.countries,
      ':r': round,
      ':s': gameStatus,
      ':cc': countryCards,
      ':g': game.guests,
      ':e': game.eventsLog,
    };

    try {
      const response = await this.repository.update(
        this.GAMES_TABLE_NAME,
        { UUID },
        updateExpression,
        expressionAttributeValues,
      );

      if (response) {
        // return response;
        game.countries = countriesAndMissions.countries;
        game.players = countriesAndMissions.players;
        game.round = round;
        game.gameStatus = gameStatus;
        game.countryCards = countryCards;
        return game;
      }

      // TODO. Handle error
      return false;
    } catch (error) {
      console.error('ERROR: ', error);
      return false;
    }
  }

  private static getCurrentTimestamp() {
    return new Date().getTime();
  }

  public async getGame(UUID: string): Promise<any> {
    const params = {
      UUID,
    };

    try {
      const response = await this.repository.get(this.GAMES_TABLE_NAME, params);
      if (response) {
        return response.Item;
      }
      // TODO. Handle error
      return null;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  public async finishRound(UUID: string, playerColor: string): Promise<any> {
    // Get game
    const game = await this.getGame(UUID);

    // Get player
    const currentPlayer = _.find(game.players, { color: playerColor });

    if (!currentPlayer) {
      throw new Error(`Player ${playerColor} not found`);
    }

    // Check if mission completed
    const { mission } = currentPlayer;

    const currentPlayerCountries = GameService.getCountriesByPlayer(game.countries, playerColor);

    // Game finished!
    if (MissionService.missionCompleted(mission, currentPlayerCountries)) {
      console.log('Mission completed!');
      game.winner = 1;
      game.gameStatus = GameStatusType.FINISHED;

      // Save game
      try {
        const updateExpression = 'set gameStatus = :g';
        const expressionAttributeValues = {
          ':g': game.gameStatus,
        };

        const response = await this.repository.update(
          this.GAMES_TABLE_NAME,
          { UUID },
          updateExpression,
          expressionAttributeValues,
        );

        if (response) {
          return game;
        }

        // TODO. Handle error
        return false;
      } catch (error) {
        console.log(error);
        return false;
      }
    }

    const { players, round, countries } = game;

    // Order is
    // FIRST_ADD_TROOPS --> SECOND_ADD_TROOPS --> ATTACK --> ADD_TROOPS --> ATTACK --> ADD_TROOPS --> ...
    // After ATTACK round we change the playing order of players

    // Check if it's last player and we have to change round type
    if (round.playerIndex === game.players.length - 1) {
      // Change round type and change order of players
      round.playerIndex = 0;
      // let currentRound = '';

      if (round.type === RoundType.FIRST_ADD_TROOPS) {
        // First round to add troops, change to second
        round.type = RoundType.SECOND_ADD_TROOPS;

        players.forEach((player) => {
          player.troopsToAdd.free = SECOND_ROUND_TROOPS;
          player.canGetCard = false;
        });
      } else if (round.type === RoundType.SECOND_ADD_TROOPS || round.type === RoundType.ADD_TROOPS) {
        // Second round to add troops, change to attack
        round.type = RoundType.ATTACK;

        // No troops to add
        players.forEach((player) => {
          player.troopsToAdd.free = 0;
          player.canGetCard = false;
        });
        /*
      } else if (round.type === RoundType.ADD_TROOPS) {
        round.type = RoundType.ATTACK;

        // Set troops to add
        players.forEach((player) => {
          // eslint-disable-next-line no-param-reassign
          player.troopsToAdd.free = 0;
        });
        */
      } else if ([RoundType.ATTACK, RoundType.MOVE_TROOPS, RoundType.GET_CARD].includes(round.type)) {
        // Change order of players
        round.type = RoundType.ADD_TROOPS;
        round.count += 1;
        const lastPlayer = players.shift();
        players.push(lastPlayer);

        // Set troops to add
        const troopsToAdd = GameService.calculateTroopsToAdd(game.players, game.countries);

        players.forEach((player) => {
          player.troopsToAdd = troopsToAdd[player.color];
          player.canGetCard = false;
        });
      }

      // Reset troops to add
      /*
      const troopsPerPlayer = 3; // this.calculateTroopsToAddPerPlayer();

      players.forEach((player) => {
        // eslint-disable-next-line no-param-reassign
        player.troopsToAdd = troopsPerPlayer[player.id];
        // eslint-disable-next-line no-param-reassign
        player.canGetCard = false;
      });
      */

      /*
      // Add recently added troops to troops
      // TODO. Remove duplicate
      if (round.type === RoundType.ADD_TROOPS) {
        Object.keys(countries).forEach((countryKey) => {
          const country = countries[countryKey];
          country.state.troops += country.state.newTroops;
          country.state.newTroops = 0;
        });
      }
      */

      /*
      this.setState({
        currentPlayerIndex,
        players,
        currentRound,
        countries,
        countrySelection: {}, // Clear selection
      });
      */
    } else {
      // Add recently added troops to troops
      // TODO. Remove duplicate
      // const { countries, round } = game;
      /*
      if (round.type === RoundType.ADD_TROOPS) {
        Object.keys(countries).forEach((countryKey) => {
          const country = countries[countryKey];
          country.state.troops += country.state.newTroops;
          country.state.newTroops = 0;
        });
      }
      */

      // If player was moving troops or got a card, change to attack
      if ([RoundType.MOVE_TROOPS, RoundType.GET_CARD].includes(round.type)) {
        round.type = RoundType.ATTACK;
      }

      round.playerIndex += 1;

      /*
      this.setState({
        currentPlayerIndex,
        countries,
        countrySelection: {}, // Clear selection
      });
      */
    }

    // Add recently added troops to troops
    // TODO. Remove duplicate
    if (round.type === RoundType.ADD_TROOPS) {
      Object.keys(countries).forEach((countryKey) => {
        const country = countries[countryKey];
        country.state.troops += country.state.newTroops;
        country.state.newTroops = 0;
      });
    }

    // Update game
    try {
      const updateExpression = 'set players = :p, countries= :c, round= :r';
      const expressionAttributeValues = {
        ':p': players,
        ':c': countries,
        // ':cp': game.currentPlayerIndex,
        ':r': round,
      };

      const response = await this.repository.update(
        this.GAMES_TABLE_NAME,
        { UUID },
        updateExpression,
        expressionAttributeValues,
      );

      if (response) {
        return game;
      }

      // TODO. Handle error
      return false;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  public static getCountriesByPlayer(countries: {}, playerColor: string): any[] {
    const response = [];

    Object.keys(countries).forEach((countryKey) => {
      const country = countries[countryKey];
      if (country.state.player.color === playerColor) {
        response.push(country);
      }
    });

    return response;
  }

  public static calculateTroopsToAdd(players: Player[], countries: {}): { } {
    const troopsPerPlayer = { };
    const countriesPerPlayer = { };
    const initialCount = { total: 0 };

    initialCount[ContinentTypes.AFRICA] = 0;
    initialCount[ContinentTypes.ASIA] = 0;
    initialCount[ContinentTypes.EUROPE] = 0;
    initialCount[ContinentTypes.NORTH_AMERICA] = 0;
    initialCount[ContinentTypes.OCEANIA] = 0;
    initialCount[ContinentTypes.SOUTH_AMERICA] = 0;

    // Init count
    players.forEach((player) => {
      countriesPerPlayer[player.color] = { ...initialCount };
      troopsPerPlayer[player.color] = { ...initialCount };
    });

    // Count countries per continent for each player
    _.forIn(countries, (value, key) => {
      const continent = CountryService.getContinent(key);
      countriesPerPlayer[value.state.player.color].total += 1;
      countriesPerPlayer[value.state.player.color][continent] += 1;
    });

    console.log('countriesPerPlayer', countriesPerPlayer);

    _.forIn(countriesPerPlayer, (value, key) => {
      troopsPerPlayer[key].free = Math.floor(value.total / 2);

      // Check continents
      if (countriesPerPlayer[key][ContinentTypes.AFRICA] && countriesPerPlayer[key][ContinentTypes.AFRICA] === 6) {
        troopsPerPlayer[key][ContinentTypes.AFRICA] = ContinentBonus.AFRICA;
      }

      if (countriesPerPlayer[key][ContinentTypes.ASIA] && countriesPerPlayer[key][ContinentTypes.ASIA] === 15) {
        troopsPerPlayer[key][ContinentTypes.ASIA] = ContinentBonus.ASIA;
      }

      if (countriesPerPlayer[key][ContinentTypes.EUROPE] && countriesPerPlayer[key][ContinentTypes.EUROPE] === 9) {
        troopsPerPlayer[key][ContinentTypes.EUROPE] = ContinentBonus.EUROPE;
      }

      if (countriesPerPlayer[key][ContinentTypes.NORTH_AMERICA] && countriesPerPlayer[key][ContinentTypes.NORTH_AMERICA] === 10) {
        troopsPerPlayer[key][ContinentTypes.NORTH_AMERICA] = ContinentBonus.NORTH_AMERICA;
      }

      if (countriesPerPlayer[key][ContinentTypes.OCEANIA] && countriesPerPlayer[key][ContinentTypes.OCEANIA] === 4) {
        troopsPerPlayer[key][ContinentTypes.OCEANIA] = ContinentBonus.OCEANIA;
      }

      if (countriesPerPlayer[key][ContinentTypes.SOUTH_AMERICA] && countriesPerPlayer[key][ContinentTypes.SOUTH_AMERICA] === 6) {
        troopsPerPlayer[key][ContinentTypes.SOUTH_AMERICA] = ContinentBonus.SOUTH_AMERICA;
      }
    });

    return troopsPerPlayer;
  }

  public async exchangeCard(UUID: string, playerColor: string, countryCard: string): Promise<any> {
    // Get countries so we can update
    const game = await this.getGame(UUID);

    // Get player
    const { players } = game;
    const player = _.find(players, (obj) => obj.color === playerColor);

    if (!player) {
      throw new Error(`Player ${playerColor} not found.`);
    }

    // Find card
    const card = _.find(player.cards, (obj) => obj.country === countryCard);

    if (!card) {
      throw new Error(`Card ${countryCard} not found in player ${playerColor}`);
    }

    if (card.exchanged) {
      throw new Error(`Card ${countryCard} already exchanged`);
    }

    // Check if player has that country
    const country = _.find(game.countries, (obj) => obj.countryKey === countryCard);

    if (!country || country.state.player.color !== playerColor) {
      throw new Error(`Country ${country} does not belong to ${playerColor}`);
    }

    // Mark as exchanged
    card.exchanged = true;

    // Add 2 new troops to country
    country.state.newTroops += 2;

    // Update game
    try {
      const updateExpression = 'set players = :p, countries = :c';
      const expressionAttributeValues = {
        ':p': players,
        ':c': game.countries,
      };

      const response = await this.repository.update(
        this.GAMES_TABLE_NAME,
        { UUID },
        updateExpression,
        expressionAttributeValues,
      );

      if (response) {
        return {
          countries: game.countries,
          players,
        };
      }

      // TODO. Handle error
      return false;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  public async exchangeCards(UUID: string, playerColor: string, countryCards: string[]): Promise<any> {
    // Get countries so we can update
    const game = await this.getGame(UUID);

    // Get player
    const { players } = game;
    const player = _.find(players, (obj) => obj.color === playerColor);

    if (!player) {
      throw new Error(`Player ${playerColor} not found.`);
    }

    // Find cards
    const cards = [];
    countryCards.forEach((countryCard) => {
      const card = _.find(player.cards, (obj) => obj.country === countryCard);

      if (!card) {
        throw new Error(`Card ${countryCard} not found in player ${playerColor}`);
      }

      cards.push(card);

      // Remove card from player
      _.remove(player.cards, (obj) => obj.country === countryCard);
    });

    // Check the cards can be exchanged
    if (!CountryCard.playerCanExchangeCards(cards)) {
      throw new Error(`Can't change cards ${countryCards.join(', ')}`);
    }

    // Put cards back to deck and shuffle
    const mergedCards = _.shuffle([...game.countryCards, ...cards]);

    // Update player
    player.troopsToAdd.free += CardExchangesCount[player.cardExchangesCount];
    player.cardExchangesCount += 1;

    // Update game
    try {
      const updateExpression = 'set players = :p, countryCards= :cc';
      const expressionAttributeValues = {
        ':p': players,
        ':cc': mergedCards,
      };

      const response = await this.repository.update(
        this.GAMES_TABLE_NAME,
        { UUID },
        updateExpression,
        expressionAttributeValues,
      );

      if (response) {
        return {
          players,
        };
      }

      // TODO. Handle error
      return false;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  public async addTroops(
    UUID: string,
    playerColor: string,
    country: string,
    amount: number,
  ): Promise<any> {
    // Get countries so we can update
    const game = await this.getGame(UUID);

    if (![RoundType.ADD_TROOPS, RoundType.FIRST_ADD_TROOPS, RoundType.SECOND_ADD_TROOPS].includes(game.round.type)) {
      throw new Error(`Can not add troops in round ${game.round.type}.`);
    }

    if (!game || !game.countries || !game.countries[country]) {
      // TODO. Handle error
      console.error('NO COUNTRY FOUND');
      return null;
    }

    console.log('COUNTRY', game.countries[country].state.player.color);
    console.log('playerColor', playerColor);

    if (game.countries[country].state.player.color !== playerColor) {
      throw new Error(`Country ${country} does not belong to ${playerColor}`);
    }

    const player = _.find(game.players, (obj) => obj.color === playerColor);

    if (!player) {
      throw new Error(`Player ${playerColor} not found`);
    }

    // If player has continent bonus, try to use those troops first
    const continent = CountryService.getContinent(country);

    if (amount > 0) {
      // Adding troops
      if (player.troopsToAdd[continent] >= amount) {
        // Continent bonus
        player.troopsToAdd[continent] -= amount;
        game.countries[country].state.troops += amount;
      } else if (player.troopsToAdd.free >= amount) {
        // Check if player has free troops
        player.troopsToAdd.free -= amount;
        game.countries[country].state.troops += amount;
      } else {
        throw new Error(`Can not add more than ${player.troopsToAdd.free} troops`);
      }
    } else if (amount < 0) {
      // Removing troops
      if (game.countries[country].state.troops <= 1) {
        throw new Error(`Can not remove more than ${game.countries[country].state.troops} from ${country}`);
      }

      // If player had continent bonus, put troops back there
      if ((player.troopsToAdd[continent] || player.troopsToAdd[continent] === 0)
          && player.troopsToAdd[continent] < ContinentBonus[continent]) {
        player.troopsToAdd[continent] -= amount;
      } else {
        player.troopsToAdd.free -= amount;
      }

      game.countries[country].state.troops += amount;
    }

    // Add event
    let eventText = null;

    if (amount > 0) {
      eventText = `Player ${playerColor} added ${amount} troops to ${country}`;
    } else {
      eventText = `Player ${playerColor} removed ${amount} troops from ${country}`;
    }

    game.eventsLog.unshift({
      time: GameService.getCurrentTimestamp(),
      text: eventText,
      type: 'troopsAdded',
    });

    try {
      const updateExpression = 'set countries = :c, players = :p, eventsLog = :e';
      const expressionAttributeValues = {
        ':c': game.countries,
        ':p': game.players,
        ':e': game.eventsLog,
      };

      const response = await this.repository.update(
        this.GAMES_TABLE_NAME,
        { UUID },
        updateExpression,
        expressionAttributeValues,
      );

      if (response) {
        return response;
      }

      // TODO. Handle error
      return false;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  public async attack(UUID: string, attackerKey: string, defenderKey: string, playerColor: string): Promise<any> {
    if (attackerKey === defenderKey) {
      throw new Error('Attacker and defender can not be the same');
    }

    // TODO. check if neighbors
    if (false) {
      throw new Error(
        `Country ${attackerKey} is not a neighbour of ${defenderKey}`,
      );
    }

    // Get game to get countries
    const game = await this.getGame(UUID);
    const attacker = game.countries[attackerKey];
    const defender = game.countries[defenderKey];
    // let playerCanGetCard = false;
    let countryConquered = false;

    if (!game) {
      throw new Error(`Problem getting game ${UUID}`);
    }

    if (attacker.state.troops <= 1) {
      throw new Error('Attacker needs at least 2 troops to attack');
    }

    if (attacker.state.player.color !== playerColor) {
      throw new Error(`Country ${attackerKey} does not belong to ${playerColor}`);
    }

    if (game.round.type !== RoundType.ATTACK) {
      throw new Error(`Can not attack in round ${game.round.type}.`);
    }

    // Add event
    game.eventsLog.unshift({
      time: GameService.getCurrentTimestamp(),
      text: `Player ${playerColor} attacks ${defenderKey} from ${attackerKey}`,
      type: 'countryAttacked',
    });

    // Max 3 dices per attack
    const numberOfAttackerDices = Math.min(
      attacker.state.troops - 1,
      this.MAX_DICES_PER_THROW,
    );
    const numberOfDefenderDices = Math.min(
      defender.state.troops,
      this.MAX_DICES_PER_THROW,
    );

    // Roll dices and sort descending
    const dices = { attacker: [], defender: [] };
    dices.attacker = this.diceService.throwDices(numberOfAttackerDices).sort((a, b) => b - a);
    dices.defender = this.diceService.throwDices(numberOfDefenderDices).sort((a, b) => b - a);

    // Get copy with only the dices we need to compare attacker vs defender
    const dicesCopy = { attacker: [], defender: [] };
    dicesCopy.attacker = [...dices.attacker].slice(0, numberOfDefenderDices);
    dicesCopy.defender = [...dices.defender].slice(0, numberOfAttackerDices);

    // Update number of troops
    let defenderTroopsLost = 0;
    let attackerTroopsLost = 0;
    dicesCopy.attacker.forEach((dice, index) => {
      if (dice > dicesCopy.defender[index]) {
        // Defender lost
        defender.state.troops -= 1;
        defenderTroopsLost += 1;
      } else {
        // Attacker lost
        attacker.state.troops -= 1;
        attackerTroopsLost += 1;
      }
    });

    // Add event
    game.eventsLog.unshift({
      time: GameService.getCurrentTimestamp(),
      text: `${defenderKey} lost ${defenderTroopsLost} troops and ${attackerKey} lost ${attackerTroopsLost} troops`,
      type: 'countryAttacked',
    });

    // Attacker conquered defender
    if (defender.state.troops === 0) {
      console.log('Conquered!');
      const defenderColor = defender.state.player.color;
      defender.state.player = attacker.state.player;

      // Get attacker player
      const player = _.find(game.players, (obj) => obj.color === playerColor);

      // Add event
      game.eventsLog.unshift({
        time: GameService.getCurrentTimestamp(),
        text: `Player ${playerColor} conquered ${defenderKey}`,
        type: 'troopsMoved',
      });

      // Check if defender was killed
      const defenderCountries = GameService.getCountriesByPlayer(game.countries, defenderColor);

      if (!defenderCountries || defenderCountries.length === 0) {
        // Defender was killed
        console.log(`${defenderColor} was killed by ${playerColor}`);

        // Add event
        game.eventsLog.unshift({
          time: GameService.getCurrentTimestamp(),
          text: `${defenderColor} was killed by ${playerColor}`,
          type: 'countryAttacked',
        });

        // Check if attacker mission was to destroy defender
        if (player.mission.destroy) {
          if (player.mission.destroy === defenderColor) {
            // Attacker won
            game.gameStatus = 'finished';
            game.winner = playerColor;

            // Add event
            game.eventsLog.unshift({
              time: GameService.getCurrentTimestamp(),
              text: `${playerColor} won`,
              type: 'countryAttacked',
            });

            return game;
          }

          // If player's mission color is not playing, check next player in turn order
          if (!_.find(game.players, (obj) => obj.color === player.mission.destroy)) {
            const playerIndex = _.findIndex(game.players, (obj) => obj.color === playerColor);
            const nextIndex = (playerIndex + 1) % game.players.length;

            if (player.mission.destroy === game.players[nextIndex].color) {
              // Attacker won
              game.gameStatus = 'finished';
              game.winner = playerColor;

              // Add event
              game.eventsLog.unshift({
                time: GameService.getCurrentTimestamp(),
                text: `${playerColor} won`,
                type: 'countryAttacked',
              });

              return game;
            }
          }
        }

        // Attacker didn't win but he gets all defenders cards
        const defenderPlayer = _.find(game.players, (obj) => obj.color === defenderColor);
        let cardsFromDefenderCount = 0;

        // Attacker can have 5 cards max, the rest goes to deck
        while (defenderPlayer.cards.length > 0) {
          if (player.cards.length <= 5) {
            console.log('Give card to attacker');
            cardsFromDefenderCount += 1;
            player.cards.push(defenderPlayer.cards.pop());
          } else {
            console.log('Card back to deck');
            game.countryCards.push(defenderPlayer.cards.pop());
          }
        }

        if (cardsFromDefenderCount) {
          // Add event
          game.eventsLog.unshift({
            time: GameService.getCurrentTimestamp(),
            text: `${playerColor} got ${cardsFromDefenderCount} cards from ${defenderColor}`,
            type: 'countryAttacked',
          });
        }
      }

      // Move one by default, player might move more later
      const troopsToMove = 1;
      attacker.state.troops -= troopsToMove;
      defender.state.troops = troopsToMove;

      // Add event
      game.eventsLog.unshift({
        time: GameService.getCurrentTimestamp(),
        text: `Player ${playerColor} moved ${troopsToMove} troops from ${attacker.name} to ${defender.name}`,
        type: 'troopsMoved',
      });

      // Player can get a card
      player.canGetCard = true;
      countryConquered = true;
    }

    try {
      const updateExpression = 'set countries = :c, players = :p, eventsLog = :e, countryCards = :cc';
      const expressionAttributeValues = {
        ':c': game.countries,
        ':p': game.players,
        ':e': game.eventsLog,
        ':cc': game.countryCards,
      };

      const response = await this.repository.update(
        this.GAMES_TABLE_NAME,
        { UUID },
        updateExpression,
        expressionAttributeValues,
      );

      if (response) {
        return {
          attacker,
          defender,
          dices,
          players: game.players,
          countryConquered,
          eventsLog: game.eventsLog,
        };
      }

      // TODO. Handle error
      return false;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  public async moveTroops(
    UUID: string,
    sourceKey: string,
    targetKey: string,
    playerColor: string,
    count: number,
    conquest = false,
  ): Promise<any> {
    if (sourceKey === targetKey) {
      throw new Error('Source and target can not be the same');
    }

    // TODO. check if neighbors
    if (false) {
      throw new Error(
        `Country ${sourceKey} is not a neighbour of ${targetKey}`,
      );
    }

    // Get game to get countries
    const game = await this.getGame(UUID);
    const source = game.countries[sourceKey];
    const target = game.countries[targetKey];

    // Validations
    if (source.state.player.color !== playerColor) {
      throw new Error(`${sourceKey} does not belong to ${playerColor}`);
    }

    if (target.state.player.color !== playerColor) {
      throw new Error(`${targetKey} does not belong to ${playerColor}`);
    }

    if (source.state.troops < (count + 1)) {
      throw new Error(`Not enough troops in ${sourceKey}`);
    }

    if (![RoundType.MOVE_TROOPS, RoundType.ATTACK].includes(game.round.type)) {
      throw new Error(`Can not move troops in round ${game.round.type}.`);
    }

    source.state.troops -= count;

    if (conquest) {
      // Moved troops can attack so add to normal troop count
      target.state.troops += count;
    } else {
      target.state.newTroops += count;

      // Change round type so player can't attack any more
      game.round.type = RoundType.MOVE_TROOPS;
    }

    // Add event
    game.eventsLog.unshift({
      time: GameService.getCurrentTimestamp(),
      text: `Player ${playerColor} moved ${count} troops from ${source.name} to ${target.name}`,
      type: 'troopsMoved',
    });

    try {
      const updateExpression = 'set countries = :c, round = :r, eventsLog = :e';
      const expressionAttributeValues = {
        ':c': game.countries,
        ':r': game.round,
        ':e': game.eventsLog,
      };

      const response = await this.repository.update(
        this.GAMES_TABLE_NAME,
        { UUID },
        updateExpression,
        expressionAttributeValues,
      );

      if (response) {
        return {
          source,
          target,
          count,
          round: game.round,
          eventsLog: game.eventsLog,
        };
      }

      // TODO. Handle error
      return false;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  public async getCard(UUID: string, playerColor: string): Promise<any> {
    const game = await this.getGame(UUID);

    const { countryCards, players, round } = game;

    const newCard = countryCards.shift();
    newCard.exchanged = false;

    const player = _.find(players, (obj) => obj.color === playerColor);

    if (!player) {
      throw new Error(`Player ${playerColor} not found`);
    }

    player.cards.push(newCard);
    player.canGetCard = false;

    // Change round
    round.type = RoundType.GET_CARD;

    // Update game
    try {
      const updateExpression = 'set countryCards = :cc, players = :p, round = :r';
      const expressionAttributeValues = {
        ':cc': countryCards,
        ':p': players,
        ':r': round,
      };

      const response = await this.repository.update(
        this.GAMES_TABLE_NAME,
        { UUID },
        updateExpression,
        expressionAttributeValues,
      );

      if (response) {
        return {
          player,
          countryCards,
          players,
          round,
        };
      }

      // TODO. Handle error
      return false;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  public async scanGames(): Promise<any> {
    const params = {
      TableName: this.GAMES_TABLE_NAME,
    };

    try {
      const response = await this.repository.scan(params);
      return response;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  public async deleteGame(UUID: string): Promise<boolean> {
    const params = {
      UUID,
    };

    try {
      const response = await this.repository.delete(this.GAMES_TABLE_NAME, params);
      if (response) {
        return true;
      }
      // TODO. Handle error
      return null;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  /* ********************** */
  /* For debugging purposes */
  /* ********************** */
  public async assignCountryToPlayer(
    UUID: string,
    player: Player,
    countryKey: string,
  ): Promise<any> {
    const game = await this.getGame(UUID);

    if (!game) {
      throw new Error(`No game with UUID ${UUID}`);
    }

    // Assign country to player
    game.countries[countryKey].state.player = player;

    try {
      const updateExpression = 'set countries = :c';
      const expressionAttributeValues = {
        ':c': game.countries,
      };

      const response = await this.repository.update(
        this.GAMES_TABLE_NAME,
        { UUID },
        updateExpression,
        expressionAttributeValues,
      );

      if (response) {
        return response;
      }

      // TODO. Handle error
      return false;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  public async addCountryCardToPlayer(
    UUID: string,
    playerColor: string,
    countryCard: string,
  ): Promise<any> {
    const game = await this.getGame(UUID);

    if (!game) {
      throw new Error(`No game with UUID ${UUID}`);
    }

    // Get a card
    const { countryCards } = game;
    const card = _.find(countryCards, (obj) => obj.country === countryCard);
    _.remove(countryCards, (obj) => obj.country === countryCard);

    // Assign card to player
    const player = _.find(game.players, (obj) => obj.color === playerColor);
    player.cards.push(card);

    try {
      const updateExpression = 'set countries = :c, players = :p, countryCards = :cc';
      const expressionAttributeValues = {
        ':c': game.countries,
        ':cc': countryCards,
        ':p': game.players,
      };

      const response = await this.repository.update(
        this.GAMES_TABLE_NAME,
        { UUID },
        updateExpression,
        expressionAttributeValues,
      );

      if (response) {
        return response;
      }

      // TODO. Handle error
      return false;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  public async setRoundType(UUID: string, roundType: string): Promise<any> {
    const game = await this.getGame(UUID);

    if (!game) {
      throw new Error(`No game with UUID ${UUID}`);
    }

    // Set round type
    game.round.type = roundType;

    try {
      const updateExpression = 'set round = :r';
      const expressionAttributeValues = {
        ':r': game.round,
      };

      const response = await this.repository.update(
        this.GAMES_TABLE_NAME,
        { UUID },
        updateExpression,
        expressionAttributeValues,
      );

      if (response) {
        return response;
      }

      // TODO. Handle error
      return false;
    } catch (error) {
      console.log(error);
      return false;
    }
  }
}

export default GameService;
