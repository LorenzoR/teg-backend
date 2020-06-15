/* eslint-disable no-param-reassign */
import _ from 'lodash';
import {
  attribute,
  hashKey,
  rangeKey,
  table,
} from '@aws/dynamodb-data-mapper-annotations';

import { embed } from '@aws/dynamodb-data-mapper';

import Player from './Player';
import Country from './Country';
import CountryCard from './CountryCard';
import Round, { RoundType } from './Round';
import EventsLog from './EventsLog';
// import { CountryType } from './Country';
import { ContinentTypes } from './Continent';


import CountryService from '../services/CountryService';
import MissionService from '../services/MissionService';
import DiceService from '../services/DiceService';
import DealService from '../services/DealService';

interface RoundType {
  count: number;
  type: string;
  playerIndex: number;
}

export interface GameType {
  UUID: string;
  gameStatus: string;
  guests?: Player [];
  players?: Player [];
  countries?: Country [];
  round: RoundType;
  countryCards: CountryCard[];
  eventsLog?: EventsLog[];
  winner?: string;
}

const ContinentBonus = {
  AFRICA: 3,
  EUROPE: 5,
  SOUTH_AMERICA: 3,
  NORTH_AMERICA: 5,
  OCEANIA: 2,
  ASIA: 7,
};

const GameStatusType = {
  WAITING_PLAYERS: 'waitingPlayers',
  STARTED: 'started',
  FINISHED: 'finished',
};

const MAX_DICES_PER_THROW = 3;

const FIRST_ROUND_TROOPS = 5;
const SECOND_ROUND_TROOPS = 3;

// TODO. Don't hard-code values
const CardExchangesCount = [4, 7, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];

// @table('local-teg-games')
@table('teg-games')
class Game {
  @hashKey({
    type: 'String',
  })
  public UUID?: string;

  @attribute({ memberType: embed(Player) })
  public guests: Player [] = [];

  // @attribute({ memberType: embed(Player) })
  @attribute({ memberType: embed(Player) })
  public players?: Player [] = [];

  @attribute({ memberType: embed(Country) })
  public countries?: Country [] = [];

  @attribute({ memberType: embed(Round) })
  public round: Round;

  @attribute({ memberType: embed(EventsLog) })
  public eventsLog?: EventsLog[] = [];

  @attribute({ memberType: embed(CountryCard) })
  public countryCards?: CountryCard[];

  @attribute()
  public gameStatus: string;

  @attribute()
  public winner?: string;

  private diceService!: DiceService;

  public constructor() {
    /*
    if (game) {
      this.UUID = game.UUID;
      this.guests = game.guests;
      this.players = game.players;
      this.countries = game.countries;
      this.round = game.round;
      this.eventsLog = game.eventsLog;
      this.gameStatus = game.gameStatus;
      this.countryCards = game.countryCards;
      this.winner = null;
    }
    */

    this.diceService = new DiceService();
  }

  public getGame(): GameType {
    return {
      UUID: this.UUID,
      guests: this.guests,
      players: this.players,
      countries: this.countries,
      round: this.round,
      eventsLog: this.eventsLog,
      gameStatus: this.gameStatus,
      countryCards: this.countryCards,
      winner: this.winner,
    };
  }

  public initGame(): Game {
    // Set first round
    const round = {
      count: 1,
      type: RoundType.FIRST_ADD_TROOPS,
      playerIndex: 0,
    };

    // Set status to STARTED
    const gameStatus = GameStatusType.WAITING_PLAYERS;

    // Return game;
    this.round = round;
    this.gameStatus = gameStatus;

    return this;
  }

  // Start a game
  public startGame(): Game {
    // Set first round
    const round = {
      count: 1,
      type: RoundType.FIRST_ADD_TROOPS,
      playerIndex: 0,
    };

    // Troops to add
    this.players.forEach((player) => {
      // eslint-disable-next-line no-param-reassign
      player.troopsToAdd = { free: FIRST_ROUND_TROOPS };
    });

    // Add countries and missions
    const countriesAndMissions = DealService.dealCountriesAndMissions(this.players);

    // Country cards
    const countryCards = DealService.dealCountryCards();

    // Set status to STARTED
    const gameStatus = GameStatusType.STARTED;

    // Remove guests
    this.guests = [];

    // Add event
    this.eventsLog = [{
      time: Game.getCurrentTimestamp(),
      text: 'Game started',
      type: 'gameStarted',
    }];

    // Return game;
    this.countries = countriesAndMissions.countries;
    this.players = countriesAndMissions.players;
    this.round = round;
    this.gameStatus = gameStatus;
    this.countryCards = countryCards;

    return this;
  }

  public hasStarted(): boolean {
    return this.gameStatus === 'started';
  }

  // Add a guest
  public addGuest(guestId: string): Game | null {
    if (!guestId) {
      return null;
    }

    // Check if there is already a player with that ID
    if (this.players && _.find(this.players, (obj) => obj.id === guestId)) {
      return null;
    }

    const guest = {
      // id: guestId, isAdmin: false, name: null, color: null,
      id: guestId, isAdmin: false,
    };

    if (!this.guests || this.guests.length === 0) {
      this.guests = [];
      guest.isAdmin = true;
    }

    this.guests.push(guest);

    return this;
  }

  // Remove a guest
  public removeGuest(guestId: string): Game | null {
    if (!guestId || !this.guests) {
      return null;
    }

    const removedGuest = _.remove(this.guests, (obj) => obj.id === guestId);

    // If waiting for players and there is only one guest or removed player was admin, make first player admin
    if (this.guests && this.gameStatus === GameStatusType.WAITING_PLAYERS && (this.guests.length === 1 || removedGuest.isAdmin)) {
      const guest = this.guests[0];
      guest.isAdmin = true;
    }

    return this;
  }

  // Add player to game
  public addPlayer(player: Player): any {
    // Check if there is a guest with that ID and if it was admin
    let isAdmin = false;
    if (this.guests) {
      const guest = _.find(this.guests, (obj) => obj.id === player.id);
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

    if (this.players) {
      players = this.players;
    } else {
      players = [];
    }

    players.push(newPlayer);

    // Add event
    this.eventsLog.unshift({
      time: Game.getCurrentTimestamp(),
      text: `Player ${player.name} (${player.color}) joined game`,
      type: 'playerAdded',
    });

    return this;
  }

  // Remove a player
  public removePlayer(playerId: string): any {
    let removedPlayer = null;

    if (!this.players) {
      return null;
    }

    if (this.gameStatus === GameStatusType.STARTED) {
      // If game has started set status to offline so player can re-connect
      removedPlayer = _.find(this.players, (obj) => obj.id === playerId);
      if (removedPlayer) {
        // removedPlayer.id = null;
        removedPlayer.playerStatus = 'offline';
      }
    } else {
      // If game hasn't started just remove player
      removedPlayer = _.remove(this.players, (obj) => obj.id === playerId);
    }

    console.log('Removed player', removedPlayer);

    return removedPlayer && removedPlayer.length ? removedPlayer[0] : removedPlayer;
  }

  // Re-connect a player
  public reConnectPlayer(color: string, id: string): any {
    if (!this.players) {
      return false;
    }

    // Find player by color
    const { players } = this;
    const player = _.find(players, (obj) => obj.color === color);

    if (!player) {
      return false;
    }

    // Update ID and status
    player.id = id;
    player.playerStatus = 'online';

    return { player, players };
  }

  // Add troops to a country
  public addTroops(playerId: string, countryKey: string, amount: number): Country {
    // Get player by ID
    const player = this.getPlayerById(playerId);

    if (!player) {
      throw new Error(`Player ID ${playerId} not found in game ${this.UUID}`);
    }

    // Get player color
    const playerColor = player.color;

    // Check if it's that player's round
    if (!this.isPlayerTurn(playerColor)) {
      throw new Error(`Not player ${playerColor} turn`);
    }

    if (![RoundType.ADD_TROOPS, RoundType.FIRST_ADD_TROOPS, RoundType.SECOND_ADD_TROOPS].includes(this.round.type)) {
      throw new Error(`Can not add troops in round ${this.round.type}.`);
    }

    // Get country
    const country = _.find(this.countries, { countryKey });

    if (!this.countries || !country) {
      // TODO. Handle error
      throw new Error(`Country ${country.countryKey} not found`);
    }

    if (country.state.player.color !== playerColor) {
      throw new Error(`Country ${country.countryKey} does not belong to ${playerColor}`);
    }

    if (!player) {
      throw new Error(`Player ${playerColor} not found`);
    }

    // If player has continent bonus, try to use those troops first
    const continent = country.getContinent();

    if (amount > 0) {
      // Adding troops
      if (player.troopsToAdd[continent] >= amount) {
        // Continent bonus
        player.troopsToAdd[continent] -= amount;
        country.state.newTroops += amount;
      } else if (player.troopsToAdd.free >= amount) {
        // Check if player has free troops
        player.troopsToAdd.free -= amount;
        country.state.newTroops += amount;
      } else {
        throw new Error(`Can not add more than ${player.troopsToAdd.free} troops`);
      }
    } else if (amount < 0) {
      // Removing troops
      if (country.state.newTroops < 1) {
        throw new Error(`Can not remove more than ${country.state.troops} from ${country.countryKey}`);
      }

      // If player had continent bonus, put troops back there
      if ((player.troopsToAdd[continent] || player.troopsToAdd[continent] === 0)
          && player.troopsToAdd[continent] < ContinentBonus[continent]) {
        player.troopsToAdd[continent] -= amount;
      } else {
        player.troopsToAdd.free -= amount;
      }

      country.state.newTroops += amount;
    }

    // Add event
    let eventText = null;

    if (amount > 0) {
      eventText = `Player ${playerColor} added ${amount} troops to ${country.countryKey}`;
    } else {
      eventText = `Player ${playerColor} removed ${amount} troops from ${country.countryKey}`;
    }

    this.eventsLog.unshift({
      time: Game.getCurrentTimestamp(),
      text: eventText,
      type: 'troopsAdded',
    });

    console.log(eventText);

    return country;
  }

  // Finish player turn
  public finishTurn(playerId: string): Game {
    // Get player
    const currentPlayer = this.getPlayerById(playerId);

    if (!currentPlayer) {
      throw new Error(`Player ID ${playerId} not found`);
    }

    const playerColor = currentPlayer.color;

    // Check if mission completed
    const { mission } = currentPlayer;

    const currentPlayerCountries = Game.getCountriesByPlayer(this.countries, playerColor);

    // Game finished!
    if (MissionService.missionCompleted(mission, currentPlayerCountries)) {
      console.log('Mission completed!');
      this.winner = playerColor;
      this.gameStatus = GameStatusType.FINISHED;

      return this;
    }

    const { players, round, countries } = this;

    // Order is
    // FIRST_ADD_TROOPS --> SECOND_ADD_TROOPS --> ATTACK --> ADD_TROOPS --> ATTACK --> ADD_TROOPS --> ...
    // After ATTACK round we change the playing order of players

    // Check if it's last player and we have to change round type
    if (round.playerIndex === players.length - 1) {
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
      } else if ([RoundType.ATTACK, RoundType.MOVE_TROOPS, RoundType.GET_CARD].includes(round.type)) {
        // Change order of players
        round.type = RoundType.ADD_TROOPS;
        round.count += 1;
        const lastPlayer = players.shift();
        players.push(lastPlayer);

        // Set troops to add
        const troopsToAdd = Game.calculateTroopsToAdd(players, countries);

        players.forEach((player) => {
          player.troopsToAdd = troopsToAdd[player.color];
          player.canGetCard = false;
        });
      }
    } else {
      // If player was moving troops or got a card, change to attack
      if ([RoundType.MOVE_TROOPS, RoundType.GET_CARD].includes(round.type)) {
        round.type = RoundType.ATTACK;
      }

      round.playerIndex += 1;
    }

    // Add recently added troops to troops
    // if (round.type === RoundType.ADD_TROOPS) {
    countries.forEach((country) => {
      country.state.troops += country.state.newTroops;
      country.state.newTroops = 0;
    });

    return this;
  }

  // Attack country
  public attack(playerId: string, attackerKey: string, defenderKey: string): any {
    if (attackerKey === defenderKey) {
      throw new Error('Attacker and defender can not be the same');
    }

    // Get player by ID
    const player = this.getPlayerById(playerId);

    if (!player) {
      throw new Error(`Player ID ${playerId} not found in game ${this.UUID}`);
    }

    // Get player color
    const playerColor = player.color;

    // Check if it's that player's round
    if (!this.isPlayerTurn(playerColor)) {
      throw new Error(`Not player ${playerColor} turn`);
    }

    // TODO. check if neighbors
    if (false) {
      throw new Error(
        `Country ${attackerKey} is not a neighbour of ${defenderKey}`,
      );
    }

    // Get countries
    const attacker = _.find(this.countries, { countryKey: attackerKey });
    const defender = _.find(this.countries, { countryKey: defenderKey });

    if (!attacker) {
      throw new Error(`Country ${attackerKey} not found`);
    }

    if (!defender) {
      throw new Error(`Country ${defenderKey} not found`);
    }

    let countryConquered = false;

    if (attacker.state.player.color !== playerColor) {
      throw new Error(`Country ${attackerKey} does not belong to ${playerColor}`);
    }

    if (attacker.state.troops <= 1) {
      throw new Error('Attacker needs at least 2 troops to attack');
    }

    if (this.round.type !== RoundType.ATTACK) {
      throw new Error(`Can not attack in round ${this.round.type}.`);
    }

    // Add event
    this.eventsLog.unshift({
      time: Game.getCurrentTimestamp(),
      text: `Player ${playerColor} attacks ${defenderKey} from ${attackerKey}`,
      type: 'countryAttacked',
    });

    // Max 3 dices per attack
    const numberOfAttackerDices = Math.min(
      attacker.state.troops - 1,
      MAX_DICES_PER_THROW,
    );
    const numberOfDefenderDices = Math.min(
      defender.state.troops,
      MAX_DICES_PER_THROW,
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
    this.eventsLog.unshift({
      time: Game.getCurrentTimestamp(),
      text: `${defenderKey} lost ${defenderTroopsLost} troops and ${attackerKey} lost ${attackerTroopsLost} troops`,
      type: 'countryAttacked',
    });

    // Attacker conquered defender
    if (defender.state.troops === 0) {
      console.log('Conquered!');
      const defenderColor = defender.state.player.color;
      defender.state.player = attacker.state.player;

      /*
      // Get attacker player
      const player = _.find(this.players, (obj) => obj.color === playerColor);
      */

      // Add event
      this.eventsLog.unshift({
        time: Game.getCurrentTimestamp(),
        text: `Player ${playerColor} conquered ${defenderKey}`,
        type: 'troopsMoved',
      });

      // Check if defender was killed
      const defenderCountries = Game.getCountriesByPlayer(this.countries, defenderColor);

      if (!defenderCountries || defenderCountries.length === 0) {
        // Defender was killed
        console.log(`${defenderColor} was killed by ${playerColor}`);

        // Add event
        this.eventsLog.unshift({
          time: Game.getCurrentTimestamp(),
          text: `${defenderColor} was killed by ${playerColor}`,
          type: 'countryAttacked',
        });

        // Check if attacker mission was to destroy defender
        if (player.mission.destroy) {
          if (player.mission.destroy === defenderColor) {
            // Attacker won
            this.gameStatus = 'finished';
            this.winner = playerColor;

            // Add event
            this.eventsLog.unshift({
              time: Game.getCurrentTimestamp(),
              text: `${playerColor} won`,
              type: 'countryAttacked',
            });

            return this;
          }

          // If player's mission color is not playing, check next player in turn order
          if (!_.find(this.players, (obj) => obj.color === player.mission.destroy)) {
            const playerIndex = _.findIndex(this.players, (obj) => obj.color === playerColor);
            const nextIndex = (playerIndex + 1) % this.players.length;

            if (player.mission.destroy === this.players[nextIndex].color) {
              // Attacker won
              this.gameStatus = 'finished';
              this.winner = playerColor;

              // Add event
              this.eventsLog.unshift({
                time: Game.getCurrentTimestamp(),
                text: `${playerColor} won`,
                type: 'countryAttacked',
              });

              return this;
            }
          }
        }

        // Attacker didn't win but he gets all defenders cards
        const defenderPlayer = _.find(this.players, (obj) => obj.color === defenderColor);
        let cardsFromDefenderCount = 0;

        // Attacker can have 5 cards max, the rest goes to deck
        while (defenderPlayer.cards.length > 0) {
          if (player.cards.length <= 5) {
            console.log('Give card to attacker');
            cardsFromDefenderCount += 1;
            player.cards.push(defenderPlayer.cards.pop());
          } else {
            console.log('Card back to deck');
            this.countryCards.push(defenderPlayer.cards.pop());
          }
        }

        if (cardsFromDefenderCount) {
          // Add event
          this.eventsLog.unshift({
            time: Game.getCurrentTimestamp(),
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
      this.eventsLog.unshift({
        time: Game.getCurrentTimestamp(),
        text: `Player ${playerColor} moved ${troopsToMove} troops from ${attacker.name} to ${defender.name}`,
        type: 'troopsMoved',
      });

      // Player can get a card
      player.canGetCard = true;
      countryConquered = true;
    }

    return {
      attacker,
      defender,
      dices,
      players: this.players,
      countryConquered,
      eventsLog: this.eventsLog,
    };
  }

  // Move troops between countries
  public moveTroops(playerId: string, sourceKey: string, targetKey: string, count: number, conquest = false): any {
    if (sourceKey === targetKey) {
      throw new Error('Source and target can not be the same');
    }

    // Get player by ID
    const player = this.getPlayerById(playerId);

    if (!player) {
      throw new Error(`Player ID ${playerId} not found in game ${this.UUID}`);
    }

    // Get player color
    const playerColor = player.color;

    // Check if it's that player's round
    if (!this.isPlayerTurn(playerColor)) {
      throw new Error(`Not player ${playerColor} turn`);
    }

    // Get countries
    const source = _.find(this.countries, { countryKey: sourceKey });
    const target = _.find(this.countries, { countryKey: targetKey });

    // TODO. check if neighbors
    if (false) {
      throw new Error(
        `Country ${sourceKey} is not a neighbour of ${targetKey}`,
      );
    }

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

    if (![RoundType.MOVE_TROOPS, RoundType.ATTACK].includes(this.round.type)) {
      throw new Error(`Can not move troops in round ${this.round.type}.`);
    }

    source.state.troops -= count;

    if (conquest) {
      // Moved troops can attack so add to normal troop count
      target.state.troops += count;
    } else {
      target.state.newTroops += count;

      // Change round type so player can't attack any more
      this.round.type = RoundType.MOVE_TROOPS;
    }

    // Add event
    this.eventsLog.unshift({
      time: Game.getCurrentTimestamp(),
      text: `Player ${playerColor} moved ${count} troops from ${source.name} to ${target.name}`,
      type: 'troopsMoved',
    });

    return {
      source,
      target,
      count,
      round: this.round,
      eventsLog: this.eventsLog,
    };
  }

  // Get one country card from deck
  public getCountryCard(playerId: string): {} {
    // Get player by ID
    const player = this.getPlayerById(playerId);

    if (!player) {
      throw new Error(`Player ID ${playerId} not found in game ${this.UUID}`);
    }

    // Get player color
    const playerColor = player.color;

    // Check if it's that player's round
    if (!this.isPlayerTurn(playerColor)) {
      throw new Error(`Not player ${playerColor} turn`);
    }

    const newCard = this.countryCards.shift();
    newCard.exchanged = false;

    player.cards.push(newCard);
    player.canGetCard = false;

    // Change round
    this.round.type = RoundType.GET_CARD;

    return {
      player,
      countryCards: this.countryCards,
      players: this.players,
      round: this.round,
      newCard,
    };
  }

  // Exchange one country card
  public exchangeCard(playerId: string, countryCard: string): { countries: Country[]; players: Player[] } {
    // Get player by ID
    const player = this.getPlayerById(playerId);

    if (!player) {
      throw new Error(`Player ID ${playerId} not found in game ${this.UUID}`);
    }

    // Get player color
    const playerColor = player.color;

    // Check if it's that player's round
    if (!this.isPlayerTurn(playerColor)) {
      throw new Error(`Not player ${playerColor} turn`);
    }

    // Check if it's attack round
    if (![RoundType.ATTACK, RoundType.MOVE_TROOPS, RoundType.GET_CARD].includes(this.round.type)) {
      throw new Error(`Can't change card in ${this.round.type} round`);
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
    const country = _.find(this.countries, (obj) => obj.countryKey === countryCard);

    if (!country || country.state.player.color !== playerColor) {
      throw new Error(`Country ${country} does not belong to ${playerColor}`);
    }

    // Mark as exchanged
    card.exchanged = true;

    // Add 2 new troops to country
    country.state.newTroops += 2;

    return {
      countries: this.countries,
      players: this.players,
    };
  }

  // Exchange three cards
  public exchangeCards(playerId: string, countryCards: string[]): any {
    // Get player by ID
    const player = this.getPlayerById(playerId);

    if (!player) {
      throw new Error(`Player ID ${playerId} not found in game ${this.UUID}`);
    }

    // Get player color
    const playerColor = player.color;

    // Check if it's that player's round
    if (!this.isPlayerTurn(playerColor)) {
      throw new Error(`Not player ${playerColor} turn`);
    }

    // Check if it's add troops round
    if (this.round.type !== RoundType.ADD_TROOPS) {
      throw new Error(`Can't change card in ${this.round.type} round`);
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
    const mergedCards = _.shuffle([...this.countryCards, ...cards]);
    this.countryCards = mergedCards;

    // Update player
    player.troopsToAdd.free += CardExchangesCount[player.cardExchangesCount];
    player.cardExchangesCount += 1;

    return {
      countryCards: this.countryCards,
      players: this.players,
    };
  }

  private isPlayerTurn(playerColor: string): boolean {
    const player = this.getPlayerByColor(playerColor);

    if (!player || player.color !== this.players[this.round.playerIndex].color) {
      return false;
    }

    return true;
  }

  public getPlayerByColor(playerColor: string): Player {
    if (!this.players || this.players.length === 0) {
      return null;
    }

    // Find by color
    return _.find(this.players, (obj) => obj.color === playerColor);
  }

  public getPlayerById(playerId: string): Player {
    if (!this.players || this.players.length === 0) {
      console.error('not enough players');
      return null;
    }

    // Find by ID
    return _.find(this.players, (obj) => obj.id === playerId);
  }

  private static getCurrentTimestamp(): number {
    return new Date().getTime();
  }

  public static getCountriesByPlayer(countries: {}, playerColor: string): Country[] {
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
    const initialCount = { free: 0, total: 0 };

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
      const country = countries[key];
      const continent = country.getContinent();
      countriesPerPlayer[value.state.player.color].free += 1;
      countriesPerPlayer[value.state.player.color][continent] += 1;
    });

    console.log('countriesPerPlayer', countriesPerPlayer);

    _.forIn(countriesPerPlayer, (value, key) => {
      troopsPerPlayer[key].free = Math.floor(value.free / 2);
      troopsPerPlayer[key].total = troopsPerPlayer[key].free;

      // Check continents
      if (countriesPerPlayer[key][ContinentTypes.AFRICA] && countriesPerPlayer[key][ContinentTypes.AFRICA] === 6) {
        troopsPerPlayer[key][ContinentTypes.AFRICA] = ContinentBonus.AFRICA;
        troopsPerPlayer[key].total += ContinentBonus.AFRICA;
      }

      if (countriesPerPlayer[key][ContinentTypes.ASIA] && countriesPerPlayer[key][ContinentTypes.ASIA] === 15) {
        troopsPerPlayer[key][ContinentTypes.ASIA] = ContinentBonus.ASIA;
        troopsPerPlayer[key].total += ContinentBonus.ASIA;
      }

      if (countriesPerPlayer[key][ContinentTypes.EUROPE] && countriesPerPlayer[key][ContinentTypes.EUROPE] === 9) {
        troopsPerPlayer[key][ContinentTypes.EUROPE] = ContinentBonus.EUROPE;
        troopsPerPlayer[key].total += ContinentBonus.EUROPE;
      }

      if (countriesPerPlayer[key][ContinentTypes.NORTH_AMERICA] && countriesPerPlayer[key][ContinentTypes.NORTH_AMERICA] === 10) {
        troopsPerPlayer[key][ContinentTypes.NORTH_AMERICA] = ContinentBonus.NORTH_AMERICA;
        troopsPerPlayer[key].total += ContinentBonus.NORTH_AMERICA;
      }

      if (countriesPerPlayer[key][ContinentTypes.OCEANIA] && countriesPerPlayer[key][ContinentTypes.OCEANIA] === 4) {
        troopsPerPlayer[key][ContinentTypes.OCEANIA] = ContinentBonus.OCEANIA;
        troopsPerPlayer[key].total += ContinentBonus.OCEANIA;
      }

      if (countriesPerPlayer[key][ContinentTypes.SOUTH_AMERICA] && countriesPerPlayer[key][ContinentTypes.SOUTH_AMERICA] === 6) {
        troopsPerPlayer[key][ContinentTypes.SOUTH_AMERICA] = ContinentBonus.SOUTH_AMERICA;
        troopsPerPlayer[key].total += ContinentBonus.SOUTH_AMERICA;
      }
    });

    return troopsPerPlayer;
  }
}

export default Game;
