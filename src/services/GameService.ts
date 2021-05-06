// import { AWSError, DynamoDB } from 'aws-sdk';
import { DynamoDB } from 'aws-sdk';
// import { PromiseResult } from 'aws-sdk/lib/request';
import { Game } from '@src/models';
import { Logger } from '@src/utils';
// import Country from '../models/Country';
// import { RoundType } from '../models/Round';
import { GameRepositoryInterface } from './GameRepositoryInterface';

/*
const GameStatusType = {
    WAITING_PLAYERS: 'waitingPlayers',
    STARTED: 'started',
    FINISHED: 'finished',
};
*/

export class GameService {
    private repository!: GameRepositoryInterface;

    // private GAMES_TABLE_NAME = process.env.GAMES_TABLE || 'local-teg-games';
    // private GAMES_TABLE_NAME = 'local-teg-games';

    // private dealService!: DealService;

    constructor(repository: GameRepositoryInterface) {
        this.repository = repository;
    }

    public async newGame(UUID: string): Promise<Game | null> {
        const game = new Game();
        game.initGame();
        game.UUID = UUID;
        game.players = [];
        game.eventsLog = [];
        game.countries = [];
        game.countryCards = [];
        // game.winner = undefined;
        // game.settings = undefined;

        try {
            Logger.debug('inserting game ', game);
            const response = await this.repository.insert(game);

            if (response) {
                return game;
            }

            // TODO. Handle error
            return null;
        } catch (error) {
            Logger.debug(error);
            return null;
        }
    }

    /*
    public async newGameBAK(UUID: string): Promise<Game | null> {
        const params = {
            TableName: this.GAMES_TABLE_NAME,
            Item: {
                UUID,
                players: [],
                gameStatus: GameStatusType.WAITING_PLAYERS,
                round: {
                    count: 1,
                    type: RoundType.ADD_TROOPS,
                    playerIndex: 0,
                },
                eventsLog: [],
                countries: null,
                countryCards: [],
                currentPlayerId: null,
            },
        };

        try {
            const response = await this.repository.put(params);

            if (response) {
                return Object.assign(new Game(), params.Item);
            }

            // TODO. Handle error
            return null;
        } catch (error) {
            Logger.debug(error);
            return null;
        }
    }
    */

    public async getGame(UUID: string): Promise<Game | null> {
        if (!UUID) {
            return null;
        }

        try {
            const game = this.repository.getByID(UUID);

            if (!game) {
                return null;
            }

            return game;
        } catch (error) {
            Logger.error(error);
            return null;
        }
    }

    /*
    public async getGameBAK(UUID: string): Promise<Game | null> {
        if (!UUID) {
            return null;
        }

        const params = {
            UUID,
        };

        try {
            const response = await this.repository.get(this.GAMES_TABLE_NAME, params);
            if (response && response.Item) {
                return Object.assign(new Game(), response.Item);
            }
            // TODO. Handle error
            return null;
        } catch (error) {
            Logger.error(error);
            return null;
        }
    }
    */

    public async updateGame(game: Game): Promise<DynamoDB.DocumentClient.AttributeMap> {
        return this.repository.update(game);
    }

    /*
    public async updateGameBAK(game: Game): Promise<DynamoDB.DocumentClient.AttributeMap> {
        // Update game
        // const updateExpression = 'set players = :p, countries= :c, round= :r, gameStatus= :s, countryCards= :cc, guests = :g, eventsLog = :e, winner = :w';
        const updateExpression = 'set players = :p, countries= :c, round= :r, gameStatus= :s, countryCards= :cc, eventsLog = :e, winner = :w';
        const expressionAttributeValues = {
            ':p': game.players,
            ':c': game.countries,
            ':r': game.round,
            ':s': game.gameStatus,
            ':cc': game.countryCards,
            // ':g': game.guests,
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
                return response.Attributes;
            }

            // TODO. Handle error
            return null;
        } catch (error) {
            Logger.error('GameService::updateGame() error', error);
            return null;
        }
    }
    */

    public async scanGames(): Promise<Game[]> {
        return this.repository.getAll();
    }

    /*
    public async scanGamesBAK(): Promise<PromiseResult<DynamoDB.DocumentClient.ScanOutput, AWSError>> {
        const params = {
            TableName: this.GAMES_TABLE_NAME,
        };

        try {
            const response = await this.repository.scan(params);
            return response;
        } catch (error) {
            Logger.error(error);
            return null;
        }
    }
    */

    public async deleteGame(UUID: string): Promise<boolean> {
        return this.repository.delete(UUID);
    }

    /*
    public async deleteGameBAK(UUID: string): Promise<boolean> {
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
            Logger.error(error);
            return null;
        }
    }
    */
}
