// import { DynamoDB } from 'aws-sdk';
import _ from 'lodash';

import { Player } from '../models/Player';
// import { Country } from '../models/Country';
import { RoundType } from '../models/Round';

import DealService from './DealService';
import DiceService from './DiceService';


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

class GameService {
  private repository!: Repository;

  private diceService!: DiceService;

  private MAX_DICES_PER_THROW = 3;

  // private dealService!: DealService;

  constructor(repository: any, diceService: DiceService) {
    this.repository = repository;
    this.diceService = diceService;
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
      TableName: 'games',
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
      },
    };

    try {
      const response = await this.repository.put('games', params);

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

  public async addPlayer(UUID: string, player: Player): Promise<any> {
    // Get players so we can update
    const game = await this.getGame(UUID);

    let players;

    if (game && game.players) {
      players = game.players;
    } else {
      players = [];
    }

    players.push(player);

    const updateExpression = 'set players = :p';
    const expressionAttributeValues = {
      ':p': players,
    };

    try {
      const response = await this.repository.update(
        'games',
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
        // removedPlayer.id = null;
        removedPlayer.playerStatus = 'offline';
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
          'games',
          { UUID },
          updateExpression,
          expressionAttributeValues,
        );

        if (response) {
          // ID is unique to array should have one element only
          return removedPlayer.length ? removedPlayer[0] : removedPlayer;
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
    const player = _.find(game.players, (obj) => obj.color === color);

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
        ':p': game.players,
      };
      const response = await this.repository.update(
        'games',
        { UUID },
        updateExpression,
        expressionAttributeValues,
      );

      if (response) {
        return player;
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

  public async addGuest(UUID: string, guest: { id: string }): Promise<any> {
    // Get players so we can update
    const game = await this.getGame(UUID);

    let guests;

    if (game && game.guests) {
      guests = game.guests;
    } else {
      guests = [];
    }

    guests.push(guest);

    const updateExpression = 'set guests = :g';
    const expressionAttributeValues = {
      ':g': guests,
    };

    try {
      const response = await this.repository.update(
        'games',
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
    // Get players so we can update
    const game = await this.getGame(UUID);

    if (game && game.guests) {
      _.remove(game.guests, (obj) => obj.id === guestId);

      const updateExpression = 'set guests = :g';
      const expressionAttributeValues = {
        ':g': game.guests,
      };

      try {
        const response = await this.repository.update(
          'games',
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
      type: RoundType.ADD_TROOPS,
      playerIndex: 0,
    };

    // const currentPlayerIndex = 0;

    // Add countries and missions
    const countriesAndMissions = DealService.dealCountriesAndMissions(
      game.players,
    );

    // Country cards
    const countryCards = DealService.dealCountryCards();

    // Set status to STARTED
    const gameStatus = GameStatusType.STARTED;

    // Update game
    const updateExpression =
      'set players = :p, countries= :c, round= :r, gameStatus= :s, countryCards= :cc';
    const expressionAttributeValues = {
      ':p': countriesAndMissions.players,
      ':c': countriesAndMissions.countries,
      // ':cp': currentPlayerIndex,
      ':r': round,
      ':s': gameStatus,
      ':cc': countryCards,
    };

    try {
      const response = await this.repository.update(
        'games',
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
        // game.currentPlayerIndex = currentPlayerIndex;
        return game;
      }

      // TODO. Handle error
      return false;
    } catch (error) {
      console.error('ERROR: ', error);
      return false;
    }
  }

  public async getGame(UUID: string): Promise<any> {
    const params = {
      UUID,
    };

    try {
      const response = await this.repository.get('games', params);
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

  public async finishRound(UUID: string): Promise<any> {
    // Get game
    const game = await this.getGame(UUID);

    /*
    // Check if mission completed
    const mission = this.state.players[this.state.currentPlayerIndex].mission;

    const currentPlayerCountries = this.getCountriesByPlayer(
      this.state.currentPlayerIndex,
    );

    if (Mission.missionCompleted(mission, currentPlayerCountries)) {
      console.log('Mission completed!');
    }
    */
    const { players, round, countries } = game;

    // Check if it's last player and we have to change round type
    if (round.playerIndex === game.players.length - 1) {
      // Change round type and change order of players
      round.playerIndex = 0;
      // let currentRound = '';

      if (round.type === RoundType.ADD_TROOPS) {
        round.type = RoundType.ATTACK;
      } else if (
        round.type === RoundType.ATTACK || round.type === RoundType.MOVE_TROOPS
      ) {
        // Change order of players
        round.type = RoundType.ADD_TROOPS;
        round.count += 1;
        const lastPlayer = players.shift();
        players.push(lastPlayer);
      }

      // Reset troops to add
      const troopsPerPlayer = 3; // this.calculateTroopsToAddPerPlayer();

      players.forEach((player) => {
        // eslint-disable-next-line no-param-reassign
        player.troopsToAdd = troopsPerPlayer[player.id];
        // eslint-disable-next-line no-param-reassign
        player.canGetCard = false;
      });

      // Add recently added troops to troops
      // TODO. Remove duplicate
      if (round.type === RoundType.ADD_TROOPS) {
        Object.keys(countries).forEach((countryKey) => {
          const country = countries[countryKey];
          country.state.troops += country.state.newTroops;
          country.state.newTroops = 0;
        });
      }

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

      if (round.type === RoundType.ADD_TROOPS) {
        Object.keys(countries).forEach((countryKey) => {
          const country = countries[countryKey];
          country.state.troops += country.state.newTroops;
          country.state.newTroops = 0;
        });
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
        'games',
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

  public async addTroops(
    UUID: string,
    country: string,
    amount: number,
  ): Promise<any> {
    // Get countries so we can update
    const game = await this.getGame(UUID);

    let guests;

    if (!game || !game.countries || !game.countries[country]) {
      // TODO. Handle error
      console.error('NO COUNTRY FOUND');
      return null;
    }

    game.countries[country].state.troops += amount;

    try {
      const updateExpression = 'set countries = :c';
      const expressionAttributeValues = {
        ':c': game.countries,
      };

      const response = await this.repository.update(
        'games',
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

  public async attack(UUID: string, attackerKey: string, defenderKey: string, playerId: string): Promise<any> {
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

    if (attacker.state.player.id !== playerId) {
      throw new Error(`Country ${attackerKey} does not belong to ${playerId}`);
    }

    // Max 3 dices per attack
    const numberOfAttackerDices = Math.min(
      attacker.state.troops - 1,
      this.MAX_DICES_PER_THROW,
    );
    const numberOfDefenderDices = Math.min(
      defender.state.troops,
      this.MAX_DICES_PER_THROW,
    );

    // Roll dices
    const dices = { attacker: [], defender: [] };
    dices.attacker = this.diceService.throwDices(numberOfAttackerDices);
    dices.defender = this.diceService.throwDices(numberOfDefenderDices);

    // Sort descending
    const dicesCopy = { attacker: [], defender: [] };
    dicesCopy.attacker = [...dices.attacker]
      .sort((a, b) => b - a)
      .slice(0, numberOfDefenderDices);
    dicesCopy.defender = [...dices.defender]
      .sort((a, b) => b - a)
      .slice(0, numberOfAttackerDices);

    // Update number of troops
    dicesCopy.attacker.forEach((dice, index) => {
      if (dice > dicesCopy.defender[index]) {
        // Defender lost
        defender.state.troops -= 1;
      } else {
        // Attacker lost
        attacker.state.troops -= 1;
      }
    });

    if (defender.state.troops === 0) {
      console.log('Conquered!');
      defender.state.player = attacker.state.player;

      // Move one by default, player might move more later
      const troopsToMove = 1;
      attacker.state.troops -= troopsToMove;
      defender.state.troops = troopsToMove;

      // Get player
      const player = _.find(game.players, (obj) => obj.color === attacker.state.player.color);
      player.canGetCard = true;
      countryConquered = true;
    }

    // TODO. Update game
    try {
      const updateExpression = 'set countries = :c, players = :p';
      const expressionAttributeValues = {
        ':c': game.countries,
        ':p': game.players,
      };

      const response = await this.repository.update(
        'games',
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
        };
      }

      // TODO. Handle error
      return false;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  public async moveTroops(UUID: string, sourceKey: string, targetKey: string, playerId: string, count: number): Promise<any> {
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
    if (source.state.player.id !== playerId) {
      throw new Error(`${sourceKey} does not belong to ${playerId}`);
    }

    if (target.state.player.id !== playerId) {
      throw new Error(`${targetKey} does not belong to ${playerId}`);
    }

    if (source.state.troops < (count + 1)) {
      throw new Error(`Not enough troops in ${sourceKey}`);
    }

    source.state.troops -= count;
    target.state.newTroops += count;

    try {
      const updateExpression = 'set countries = :c';
      const expressionAttributeValues = {
        ':c': game.countries,
      };

      const response = await this.repository.update(
        'games',
        { UUID },
        updateExpression,
        expressionAttributeValues,
      );

      if (response) {
        return {
          source,
          target,
          count,
        };
      }

      // TODO. Handle error
      return false;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  public async getCard(UUID: string, playerId: string): Promise<any> {
    const game = await this.getGame(UUID);

    const { countryCards, players } = game;

    const newCard = countryCards.shift();
    newCard.exchanged = false;

    const player = _.find(players, (obj) => obj.id === playerId);

    if (!player) {
      throw new Error(`Player ${playerId} not found`);
    }

    player.cards.push(newCard);
    player.canGetCard = false;

    // Update game
    try {
      const updateExpression = 'set countryCards = :cc, players = :p';
      const expressionAttributeValues = {
        ':cc': countryCards,
        ':p': players,
      };

      const response = await this.repository.update(
        'games',
        { UUID },
        updateExpression,
        expressionAttributeValues,
      );

      if (response) {
        return {
          countryCards,
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

  public async scanGames(): Promise<any> {
    const params = {
      TableName: 'games',
    };

    try {
      const response = await this.repository.scan('games', params);
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
      const response = await this.repository.delete('games', params);
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

  // For debugging purposes
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
        'games',
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
