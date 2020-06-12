/* eslint-disable no-param-reassign */
// import { DynamoDB } from 'aws-sdk';
import _ from 'lodash';

import Game from '../models/Game';
import { Player } from '../models/Player';
// import { CountryType } from '../models/Country';
import Country from '../models/Country';
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

  public async newGame(UUID: string): Promise<Game | null> {
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
        countries: null,
        countryCards: [],
      },
    };

    try {
      const response = await this.repository.put(this.GAMES_TABLE_NAME, params);

      if (response) {
        return new Game(params.Item);
      }

      // TODO. Handle error
      return null;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  public async getGame(UUID: string): Promise<Game | null> {
    if (!UUID) {
      return null;
    }

    const params = {
      UUID,
    };

    try {
      const response = await this.repository.get(this.GAMES_TABLE_NAME, params);
      if (response && response.Item) {
        return new Game(response.Item);
      }
      // TODO. Handle error
      return null;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  public async updateGame3(game: Game): Promise<Game | null> {
    // Delete game
    await this.deleteGame(game.UUID);

    // Insert new game
    try {
      const params = {
        // TableName: this.GAMES_TABLE_NAME,
        Item: game.getGame(),
      };

      const response = await this.repository.put(this.GAMES_TABLE_NAME, params);

      if (response) {
        return response;
      }

      // TODO. Handle error
      return null;
    } catch (error) {
      console.error('GameService::updateGame()', error);
      return null;
    }
  }

  public async updateGame(game: Game): Promise<Game | null> {
    // Update game
    const updateExpression = 'set players = :p, countries= :c, round= :r, gameStatus= :s, countryCards= :cc, guests = :g, eventsLog = :e, winner = :w';
    const expressionAttributeValues = {
      ':p': game.players,
      ':c': game.countries,
      ':r': game.round,
      ':s': game.gameStatus,
      ':cc': game.countryCards,
      ':g': game.guests,
      ':e': game.eventsLog,
      ':w': game.winner,
    };

    try {
      const response = await this.repository.update(
        this.GAMES_TABLE_NAME,
        { UUID: game.UUID },
        updateExpression,
        expressionAttributeValues,
      );

      if (response) {
        return response;
      }

      // TODO. Handle error
      return null;
    } catch (error) {
      console.error('GameService::updateGame() error', error);
      return null;
    }
  }

  public async updateCountry(UUID: string, country: Country): Promise<Game | null> {
    // Update game
    const updateExpression = 'set countries.#countryKey = :c';
    const expressionAttributeNames = {
      '#countryKey': country.countryKey,
    };

    const expressionAttributeValues = {
      ':c': country,
    };

    try {
      const response = await this.repository.update(
        this.GAMES_TABLE_NAME,
        { UUID },
        updateExpression,
        expressionAttributeValues,
        expressionAttributeNames,
      );

      if (response) {
        return response;
      }

      // TODO. Handle error
      return null;
    } catch (error) {
      console.error('GameService::updateCountriesAndPlayers() error', error);
      return null;
    }
  }

  public async updateCountriesAndPlayers(game: Game): Promise<Game | null> {
    // Update game
    const updateExpression = 'set players = :p, countries= :c';
    const expressionAttributeValues = {
      ':p': game.players,
      ':c': game.countries,
    };

    try {
      const response = await this.repository.update(
        this.GAMES_TABLE_NAME,
        { UUID: game.UUID },
        updateExpression,
        expressionAttributeValues,
      );

      if (response) {
        return response;
      }

      // TODO. Handle error
      return null;
    } catch (error) {
      console.error('GameService::updateCountriesAndPlayers() error', error);
      return null;
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

  public async setRoundType(UUID: string, roundType: string, playerColor = null): Promise<any> {
    const game = await this.getGame(UUID);

    if (!game) {
      throw new Error(`No game with UUID ${UUID}`);
    }

    // Set round type
    game.round.type = roundType;

    if (playerColor) {
      // Get index
      const playerIndex = _.findIndex(game.players, (obj) => obj.color === playerColor);
      game.round.playerIndex = playerIndex;
    }

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
