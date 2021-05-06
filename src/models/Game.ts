/* eslint-disable no-param-reassign */
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import {
    attribute,
    hashKey,
    table,
} from '@aws/dynamodb-data-mapper-annotations';

import { embed } from '@aws/dynamodb-data-mapper';

import { Logger } from '@src/utils';

import { Player } from './Player';
import Country from './Country';
import CountryCard from './CountryCard';
import Round, { RoundType } from './Round';
import EventsLog from './EventsLog';
import { ContinentTypes } from './Continent';

import MissionService from '../services/MissionService';
import DiceService from '../services/DiceService';
import DealService from '../services/DealService';
import GameSettings from './GameSettings';

interface RoundType {
    count: number;
    type: string;
    playerIndex: number;
}

export interface GameType {
    UUID: string;
    gameStatus: string;
    // guests?: Player [];
    players?: Player[];
    countries?: Country[];
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

export const GameStatusType = {
    WAITING_PLAYERS: 'waitingPlayers',
    STARTED: 'started',
    FINISHED: 'finished',
};

const MAX_DICES_PER_THROW = 3;

const FIRST_ROUND_TROOPS = 5;
const SECOND_ROUND_TROOPS = 3;

// const CardExchangesCount = [4, 7, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];
const CardExchangesCount = (cardExchangesCount: number) => {
    if (cardExchangesCount === 0) {
        return 4;
    }

    if (cardExchangesCount === 1) {
        return 7;
    }

    return 10 + 5 * (cardExchangesCount - 2);
};

interface Dices {
    attacker: number[];
    defender: number;
}

interface MoveTroopsResponse {
    source: Country;
    target: Country;
    count: number;
    round: Round;
    eventsLog: EventsLog[];
}

interface AttackResponse {
    attacker: Country;
    defender: Country;
    dices: Dices;
    countryConquered: boolean;
    players: Player[];
    eventsLog: EventsLog[];
    winner?: Player;
}

// @table('local-teg-games')
@table('teg-games')
export class Game {
    @hashKey({
        type: 'String',
    })
    public UUID?: string;

    @attribute({ memberType: embed(GameSettings) })
    public settings: GameSettings;

    // @attribute({ memberType: embed(Player) })
    // public guests: Player [] = [];

    // @attribute({ memberType: embed(Player) })
    @attribute({ memberType: embed(Player) })
    public players?: Player[] = [];

    @attribute({ memberType: embed(Country) })
    public countries?: Country[] = [];

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
        this.gameStatus = GameStatusType.WAITING_PLAYERS;
    }

    public getGame(): GameType {
        return {
            UUID: this.UUID,
            // guests: this.guests,
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
            gotCard: false,
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
            gotCard: false,
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

        // // Remove guests
        // this.guests = [];

        // Add event
        this.eventsLog = [{
            time: Game.getCurrentTimestamp(),
            text: 'Game started',
            type: 'gameStarted',
            playerColor: 'grey',
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

    public setSettings(settings: GameSettings): void {
        this.settings = settings;
    }

    /*
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
        id: guestId,
        isAdmin: false,
        playerStatus: 'online',
        };

        if (!this.getAdmin()) {
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

        // If waiting for players and there is only one guest
        // or removed player was admin, make first player admin
        if (this.guests && this.gameStatus === GameStatusType.WAITING_PLAYERS
            && (this.guests.length === 1 || (removedGuest && removedGuest[0].isAdmin))) {
        const guest = this.guests[0];
        guest.isAdmin = true;
        }

        return this;
    }
    */

    public addPlayerWithoutColor(id: string): Game {
        let isAdmin = false;

        if (!this.players?.length) {
            isAdmin = true;
        } else if (_.find(this.players, (player) => player.id === id)) {
            throw new Error(`Player with ID ${id} already exists`);
        }

        const newPlayer: Player = {
            id,
            playerStatus: 'online',
            isAdmin,
            cards: [],
            troopsToAdd: {
                free: FIRST_ROUND_TROOPS,
            },
            canGetCard: false,
            cardExchangesCount: 0,
        };

        let players;

        if (this.players) {
            players = this.players;
        } else {
            players = [];
        }

        players.push(newPlayer);

        // Add event
        this.addToEventsLog(
            `Player ${id} connected`,
            'playerAdded',
            'grey',
        );

        return this;
    }

    // Add player to game
    public addPlayer(player: Player): Game {
        /*
        // Check if there is a guest with that ID and if it was admin
        let isAdmin = false;
        if (this.guests) {
        const guest = _.find(this.guests, (obj) => obj.id === player.id);
        isAdmin = guest && guest.isAdmin ? guest.isAdmin : false;
        }
        */

        const newPlayer = {
            ...player,
            isAdmin: false,
            cards: [],
            playerStatus: 'online',
            troopsToAdd: {
                free: FIRST_ROUND_TROOPS,
            },
            canGetCard: false,
            cardExchangesCount: 0,
        };

        let players;

        if (this.players) {
            players = this.players;
        } else {
            players = [];
        }

        players.push(newPlayer);

        // Add event
        this.addToEventsLog(
            `Player ${player.name} (${player.color}) joined game`,
            'playerAdded',
            'grey',
        );

        return this;
    }

    public assignColorAndNameToExistingPlayer(id: string, name: string, color: string): Player {
        const player = this.players.find((p) => p.id === id);

        if (!player) {
            Logger.debug(`Player with ID ${id} not found`);
            return null;
        }

        player.name = name;
        player.color = color;

        Logger.debug(`Player ${id} is now ${name} (${color})`);

        return player;
    }

    // Remove a player
    public removePlayer(playerId: string): Player {
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

                // Add event
                this.addToEventsLog(
                    `Player ${playerId} disconnected`,
                    'playerRemoved',
                    removedPlayer.color,
                );
            }
        } else {
            // If game hasn't started just remove player
            removedPlayer = _.remove(this.players, (obj) => obj.id === playerId);

            // Add event
            this.addToEventsLog(
                `Player ${playerId} quit`,
                'playerQuit',
                removedPlayer?.color || 'grey',
            );
        }

        return removedPlayer && removedPlayer.length ? removedPlayer[0] : removedPlayer;
    }

    public getAdmin(): Player {
        // Look in players
        const fromPlayers = _.find(this.players, { isAdmin: true });

        if (fromPlayers) {
            return fromPlayers;
        }

        throw new Error('Admin not found');

        // // Look in guests
        // return _.find(this.guests, { isAdmin: true });
    }

    // Re-connect a player
    public reConnectPlayer(color: string, id: string): { player: Player; players: Player[] } {
        if (!this.players) {
            return null;
        }

        Logger.debug('PLAYERS BEFORE', this.players);

        // Find player by color
        const { players } = this;
        const player = _.find(players, (obj) => obj.color === color);

        if (!player) {
            Logger.debug(`No player found with color ${color}`);
            return null;
        }

        // Update ID and status
        player.id = id;
        player.playerStatus = 'online';

        // Remove players without color
        Logger.debug(`Remove not color and ID ${id}`);
        // const filteredPlayers = players.filter((o) => o.id !== id || (o.id === id && o.color));

        this.players = [...players.filter((o) => o.id !== id || (o.id === id && o.color))];

        Logger.debug('PLAYERS AFTER', this.players);

        return { player, players: this.players };
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

        if (![
            RoundType.ADD_TROOPS,
            RoundType.FIRST_ADD_TROOPS,
            RoundType.SECOND_ADD_TROOPS,
        ].includes(this.round.type)) {
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
                if (this.isFirstOrSecondRound()) {
                    country.state.troops += amount;
                } else {
                    country.state.newTroops += amount;
                }
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

            if (this.isFirstOrSecondRound()) {
                country.state.troops += amount;
            } else {
                country.state.newTroops += amount;
            }
        }

        // Add event
        let eventText = null;

        if (amount > 0) {
            eventText = `Player ${playerColor} added ${amount} troops to ${country.countryKey}`;
        } else {
            eventText = `Player ${playerColor} removed ${amount} troops from ${country.countryKey}`;
        }

        this.addToEventsLog(eventText, 'troopsAdded', playerColor);

        return country;
    }

    private isFirstOrSecondRound(): boolean {
        return [RoundType.FIRST_ADD_TROOPS, RoundType.SECOND_ADD_TROOPS].includes(this.round.type);
    }

    // Finish player turn
    public finishTurn(playerId: string): Game {
        // Get player
        const currentPlayer = this.getPlayerById(playerId);

        if (!currentPlayer) {
            throw new Error(`Player ID ${playerId} not found`);
        }

        const playerColor = currentPlayer.color;

        const currentPlayerTurn = this.players[this.round.playerIndex];

        if (currentPlayerTurn.color !== playerColor) {
            throw new Error(`Not player ${playerColor} turn`);
        }

        // Check if mission completed
        const { mission } = currentPlayer;

        const currentPlayerCountries = Game.getCountriesByPlayer(this.countries, playerColor);

        // Game finished!
        if (MissionService.missionCompleted(mission, currentPlayerCountries)) {
            this.winner = playerColor;
            this.gameStatus = GameStatusType.FINISHED;

            return this;
        }

        const { players, round, countries } = this;

        if (!round) {
            Logger.debug('GAMEEEEEEEEEEEEEEE', this);
            throw new Error('No round found');
        }

        // Order is
        // FIRST_ADD_TROOPS --> SECOND_ADD_TROOPS -->
        // ATTACK --> ADD_TROOPS --> ATTACK --> ADD_TROOPS --> ...
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
            } else if (round.type === RoundType.SECOND_ADD_TROOPS
                || round.type === RoundType.ADD_TROOPS) {
                // Second round to add troops, change to attack
                round.type = RoundType.ATTACK;

                // No troops to add
                players.forEach((player) => {
                    player.troopsToAdd.free = 0;
                    player.canGetCard = false;
                });
            } else if ([
                RoundType.ATTACK,
                RoundType.MOVE_TROOPS,
                RoundType.GET_CARD,
            ].includes(round.type)) {
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
    public attack(
        playerId: string,
        attackerKey: string,
        defenderKey: string,
        dicesP: { attacker: number[]; defender: number[] } = null,
    ): AttackResponse {
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

        // Get countries
        const attacker = _.find(this.countries, { countryKey: attackerKey });
        const defender = _.find(this.countries, { countryKey: defenderKey });

        if (!attacker) {
            throw new Error(`Country ${attackerKey} not found`);
        }

        if (!defender) {
            throw new Error(`Country ${defenderKey} not found`);
        }

        // Check if neighbors
        if (!attacker.areNeighbours(defender)) {
            throw new Error(
                `Country ${attackerKey} is not a neighbour of ${defenderKey}`,
            );
        }

        // Countries can't belong to same player
        if (attacker.state.player.color === defender.state.player.color) {
            throw new Error(`${attackerKey} and ${defenderKey} belong to ${playerColor}`);
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
        let dices;

        if (!dicesP) {
            dices = { attacker: [], defender: [] };
            dices.attacker = this.diceService.throwDices(numberOfAttackerDices).sort((a, b) => b - a);
            dices.defender = this.diceService.throwDices(numberOfDefenderDices).sort((a, b) => b - a);
        } else {
            dices = { ...dicesP };
            dices.attacker = [...dices.attacker].slice(0, numberOfAttackerDices);
            dices.defender = [...dices.defender].slice(0, numberOfDefenderDices);
        }

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
        const dicesString = `${dices.attacker.join(' - ')} vs ${dices.defender.join(' - ')}`;
        this.addToEventsLog(
            `Player ${playerColor} attacks ${defenderKey} from ${attackerKey} (${dicesString})`,
            'countryAttacked',
            playerColor,
        );

        // Add event
        this.addToEventsLog(
            `${defenderKey} lost ${defenderTroopsLost} troops and ${attackerKey} lost ${attackerTroopsLost} troops`,
            'countryAttacked',
            playerColor,
        );

        // Attacker conquered defender
        if (defender.state.troops === 0) {
            const defenderColor = defender.state.player.color;
            defender.state.player = attacker.state.player;

            // Add event
            this.addToEventsLog(
                `Player ${playerColor} conquered ${defenderKey}`,
                'troopsMoved',
                playerColor,
            );

            // Check if defender was killed
            const defenderCountries = Game.getCountriesByPlayer(this.countries, defenderColor);

            if (!defenderCountries || defenderCountries.length === 0) {
                // Defender was killed
                Logger.debug(`${defenderColor} was killed by ${playerColor}`);

                // Add event
                this.addToEventsLog(
                    `${defenderColor} was killed by ${playerColor}`,
                    'countryAttacked',
                    playerColor,
                );

                // Check if attacker mission was to destroy defender
                if (player.mission.destroy) {
                    Logger.debug(`Player mission is to destory ${player.mission.destroy}`);
                    if (player.mission.destroy === defenderColor) {
                        // Attacker won
                        this.gameStatus = 'finished';
                        this.winner = playerColor;

                        // Add event
                        this.addToEventsLog(
                            `${playerColor} won`,
                            'countryAttacked',
                            playerColor,
                        );

                        return {
                            attacker,
                            defender,
                            dices,
                            countryConquered,
                            players: this.players,
                            eventsLog: this.eventsLog,
                            winner: player,
                        };
                    }

                    // If player's mission color is not playing or mission is player's color,
                    // check next player in turn order
                    if (!_.find(this.players, (obj) => obj.color === player.mission.destroy)
                        || playerColor === player.mission.destroy) {
                        const playerIndex = _.findIndex(this.players, (obj) => obj.color === playerColor);
                        const nextIndex = (playerIndex + 1) % this.players.length;

                        Logger.debug(`Mission changes to destroy ${this.players[nextIndex].color}`);

                        if (this.players[nextIndex].color === defenderColor) {
                            // Attacker won
                            this.gameStatus = 'finished';
                            this.winner = playerColor;

                            // Add event
                            this.addToEventsLog(
                                `${playerColor} won`,
                                'countryAttacked',
                                playerColor,
                            );

                            return {
                                attacker,
                                defender,
                                dices,
                                countryConquered,
                                players: this.players,
                                eventsLog: this.eventsLog,
                                winner: player,
                            };
                        }
                    }
                }

                // Attacker didn't win but he gets all defenders cards
                const defenderPlayer = _.find(this.players, (obj) => obj.color === defenderColor);
                let cardsFromDefenderCount = 0;

                // Attacker can have 5 cards max, the rest goes to deck
                while (defenderPlayer.cards.length > 0) {
                    if (player.cards.length <= 5) {
                        Logger.debug('Give card to attacker');
                        cardsFromDefenderCount += 1;
                        player.cards.push(defenderPlayer.cards.pop());
                    } else {
                        Logger.debug('Card back to deck');
                        this.countryCards.push(defenderPlayer.cards.pop());
                    }
                }

                if (cardsFromDefenderCount) {
                    // Add event
                    this.addToEventsLog(
                        `${playerColor} got ${cardsFromDefenderCount} cards from ${defenderColor}`,
                        'countryAttacked',
                        playerColor,
                    );
                }
            }

            // Move one by default, player might move more later
            const troopsToMove = 1;
            attacker.state.troops -= troopsToMove;
            defender.state.troops = troopsToMove;

            // Add event
            this.addToEventsLog(
                `Player ${playerColor} moved ${troopsToMove} troops from ${attacker.name} to ${defender.name}`,
                'troopsMoved',
                playerColor,
            );

            // Player can get a card
            player.canGetCard = true;
            countryConquered = true;
        }

        return {
            attacker,
            defender,
            dices,
            countryConquered,
            players: this.players,
            eventsLog: this.eventsLog,
        };
    }

    // Move troops between countries
    public moveTroops(
        playerId: string,
        sourceKey: string,
        targetKey: string,
        count: number,
        conquest = false,
    ): MoveTroopsResponse {
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
        const source: Country = _.find(this.countries, { countryKey: sourceKey });
        const target: Country = _.find(this.countries, { countryKey: targetKey });

        if (!source) {
            throw new Error(`Country ${sourceKey} not found`);
        }

        if (!target) {
            throw new Error(`Country ${targetKey} not found`);
        }

        // Check if neighbors
        if (!source.areNeighbours(target)) {
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
        this.addToEventsLog(
            `Player ${playerColor} moved ${count} troops from ${source.name} to ${target.name}`,
            'troopsMoved',
            playerColor,
        );

        return {
            source,
            target,
            count,
            round: this.round,
            eventsLog: this.eventsLog,
        };
    }

    // Get one country card from deck
    public getCountryCard(playerId: string): {
        player: Player;
        countryCards: CountryCard[];
        players: Player[];
        round: Round;
        newCard: CountryCard;
    } {
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

        this.round.gotCard = true;

        return {
            player,
            newCard,
            countryCards: this.countryCards,
            players: this.players,
            round: this.round,
        };
    }

    // Exchange one country card
    public exchangeCard(playerId: string, countryCard: string): {
        countries: Country[];
        players: Player[];
    } {
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
    public exchangeCards(playerId: string, countryCards: string[]): {
        players: Player[];
        countryCards: CountryCard[];
    } {
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
        player.troopsToAdd.free += CardExchangesCount(player.cardExchangesCount);
        player.cardExchangesCount += 1;

        return {
            countryCards: this.countryCards,
            players: this.players,
        };
    }

    public getOnlinePlayers(): Player[] {
        return _.filter(this.players, { playerStatus: 'online' });
        /*
        return _.concat(
        _.filter(this.players, { playerStatus: 'online' }),
        _.filter(this.guests, { playerStatus: 'online' }),
        );
        */
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
            return null;
        }

        // Find by ID
        return _.find(this.players, (obj) => obj.id === playerId);
    }

    /*
    public getGuestById(playerId: string): Player {
        if (!this.guests || this.guests.length === 0) {
        return null;
        }

        // Find by ID
        return _.find(this.guests, { id: playerId });
    }
    */

    /*
    // Get player or guest by ID
    public getPlayerOrGuestById(playerId: string): Player {
        return this.getPlayerById(playerId) || this.getGuestById(playerId);
    }
    */

    private addToEventsLog(text: string, type: string, playerColor: string): void {
        const time = Game.getCurrentTimestamp();
        this.eventsLog.unshift({
            time,
            text,
            type,
            playerColor,
        });
    }

    private isPlayerTurn(playerColor: string): boolean {
        const player = this.getPlayerByColor(playerColor);

        if (!player || player.color !== this.players[this.round.playerIndex].color) {
            return false;
        }

        return true;
    }

    public static getCountriesByPlayer(countries: Country[], playerColor: string): Country[] {
        const response = [];

        Object.keys(countries).forEach((countryKey) => {
            const country = countries[countryKey];
            if (country.state.player.color === playerColor) {
                response.push(country);
            }
        });

        return response;
    }

    public static calculateTroopsToAdd(players: Player[], countries: Country[]): { [key: string]: { [key: string]: number } } {
        const troopsPerPlayer = {};
        const initialCount: { [key: string]: number } = {
            free: 0,
            total: 0,
            [ContinentTypes.AFRICA]: 0,
            [ContinentTypes.ASIA]: 0,
            [ContinentTypes.EUROPE]: 0,
            [ContinentTypes.NORTH_AMERICA]: 0,
            [ContinentTypes.OCEANIA]: 0,
            [ContinentTypes.SOUTH_AMERICA]: 0,
        };
        const countriesPerPlayer: { [key: string]: typeof initialCount } = {};

        // Init count
        players.forEach((player) => {
            countriesPerPlayer[player.color] = { ...initialCount };
            troopsPerPlayer[player.color] = { ...initialCount };
        });

        // Count countries per continent for each player
        _.forIn(countries, (value: Country, key) => {
            const country = countries[key];
            const continent = country.getContinent();
            countriesPerPlayer[value.state.player.color].free += 1;
            countriesPerPlayer[value.state.player.color][continent] += 1;
        });

        _.forIn(countriesPerPlayer, (value, key) => {
            troopsPerPlayer[key].free = Math.floor(value.free / 2);
            troopsPerPlayer[key].total = troopsPerPlayer[key].free;

            // Check continents
            if (countriesPerPlayer[key][ContinentTypes.AFRICA]
                && countriesPerPlayer[key][ContinentTypes.AFRICA] === 6) {
                troopsPerPlayer[key][ContinentTypes.AFRICA] = ContinentBonus.AFRICA;
                troopsPerPlayer[key].total += ContinentBonus.AFRICA;
            } else {
                troopsPerPlayer[key][ContinentTypes.AFRICA] = null;
            }

            if (countriesPerPlayer[key][ContinentTypes.ASIA]
                && countriesPerPlayer[key][ContinentTypes.ASIA] === 15) {
                troopsPerPlayer[key][ContinentTypes.ASIA] = ContinentBonus.ASIA;
                troopsPerPlayer[key].total += ContinentBonus.ASIA;
            } else {
                troopsPerPlayer[key][ContinentTypes.ASIA] = null;
            }

            if (countriesPerPlayer[key][ContinentTypes.EUROPE]
                && countriesPerPlayer[key][ContinentTypes.EUROPE] === 9) {
                troopsPerPlayer[key][ContinentTypes.EUROPE] = ContinentBonus.EUROPE;
                troopsPerPlayer[key].total += ContinentBonus.EUROPE;
            } else {
                troopsPerPlayer[key][ContinentTypes.EUROPE] = null;
            }

            if (countriesPerPlayer[key][ContinentTypes.NORTH_AMERICA]
                && countriesPerPlayer[key][ContinentTypes.NORTH_AMERICA] === 10) {
                troopsPerPlayer[key][ContinentTypes.NORTH_AMERICA] = ContinentBonus.NORTH_AMERICA;
                troopsPerPlayer[key].total += ContinentBonus.NORTH_AMERICA;
            } else {
                troopsPerPlayer[key][ContinentTypes.NORTH_AMERICA] = null;
            }

            if (countriesPerPlayer[key][ContinentTypes.OCEANIA]
                && countriesPerPlayer[key][ContinentTypes.OCEANIA] === 4) {
                troopsPerPlayer[key][ContinentTypes.OCEANIA] = ContinentBonus.OCEANIA;
                troopsPerPlayer[key].total += ContinentBonus.OCEANIA;
            } else {
                troopsPerPlayer[key][ContinentTypes.OCEANIA] = null;
            }

            if (countriesPerPlayer[key][ContinentTypes.SOUTH_AMERICA]
                && countriesPerPlayer[key][ContinentTypes.SOUTH_AMERICA] === 6) {
                troopsPerPlayer[key][ContinentTypes.SOUTH_AMERICA] = ContinentBonus.SOUTH_AMERICA;
                troopsPerPlayer[key].total += ContinentBonus.SOUTH_AMERICA;
            } else {
                troopsPerPlayer[key][ContinentTypes.SOUTH_AMERICA] = null;
            }
        });

        return troopsPerPlayer;
    }

    public static generateNewGameUUID(): string {
        return uuidv4();
    }

    private static getCurrentTimestamp(): number {
        return new Date().getTime();
    }
}
