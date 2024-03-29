import { AWSError, DynamoDB } from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';
import Game from '../models/Game';
import Country from '../models/Country';
import { RoundType } from '../models/Round';

interface Repository {
    put: (
        params: DynamoDB.DocumentClient.PutItemInput,
    ) => Promise<PromiseResult<DynamoDB.DocumentClient.PutItemOutput, AWSError>>;
    scan: (params: DynamoDB.DocumentClient.ScanInput) => Promise<PromiseResult<DynamoDB.DocumentClient.ScanOutput, AWSError>>;
    get: (
        tableName: string,
        key: DynamoDB.DocumentClient.GetItemInput['Key'],
    ) => Promise<PromiseResult<DynamoDB.DocumentClient.GetItemOutput, AWSError>>;
    update: (
        tableName: string,
        key: DynamoDB.DocumentClient.UpdateItemInput['Key'],
        updateExpression: DynamoDB.DocumentClient.UpdateItemInput['UpdateExpression'],
        expressionAttributeValues: DynamoDB.DocumentClient.UpdateItemInput['ExpressionAttributeValues'],
        expressionAttributeNames?: DynamoDB.DocumentClient.UpdateItemInput['ExpressionAttributeNames'],
    ) => Promise<PromiseResult<DynamoDB.DocumentClient.UpdateItemOutput, AWSError>>;
    delete: (
        tableName: string,
        Key: DynamoDB.DocumentClient.DeleteItemInput['Key'],
    ) => Promise<PromiseResult<DynamoDB.DocumentClient.DeleteItemOutput, AWSError>>;
}

const GameStatusType = {
    WAITING_PLAYERS: 'waitingPlayers',
    STARTED: 'started',
    FINISHED: 'finished',
};

class GameService {
    private repository!: Repository;

    private GAMES_TABLE_NAME = process.env.GAMES_TABLE || 'local-teg-games';
    // private GAMES_TABLE_NAME = 'local-teg-games';

    // private dealService!: DealService;

    constructor(repository: Repository) {
        this.repository = repository;
    }

    public async newGame(UUID: string): Promise<Game | null> {
        const params = {
            TableName: this.GAMES_TABLE_NAME,
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
            const response = await this.repository.put(params);

            if (response) {
                return Object.assign(new Game(), params.Item);
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
                return Object.assign(new Game(), response.Item);
            }
            // TODO. Handle error
            return null;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    public async updateGame(game: Game): Promise<DynamoDB.DocumentClient.AttributeMap> {
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
            console.error('GameService::updateGame() error', error);
            return null;
        }
    }

    public async updateCountry(UUID: string, country: Country): Promise<PromiseResult<DynamoDB.DocumentClient.UpdateItemOutput, AWSError>> {
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

    public async updateCountriesAndPlayers(game: Game): Promise<PromiseResult<DynamoDB.DocumentClient.UpdateItemOutput, AWSError>> {
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

    public async scanGames(): Promise<PromiseResult<DynamoDB.DocumentClient.ScanOutput, AWSError>> {
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
}

export default GameService;
