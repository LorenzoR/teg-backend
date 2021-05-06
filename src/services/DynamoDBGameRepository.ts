import { Game } from '@src/models';
import { Logger } from '@src/utils';
import DynamoDBMapperWrapper from './DynamoDBMapperWrapper';
import { GameRepositoryInterface } from './GameRepositoryInterface';

export class DynamoDBGameRepository implements GameRepositoryInterface {
    private dynamoDBMapperWrapper!: DynamoDBMapperWrapper;

    public constructor(stage: string) {
        Logger.debug('stage', stage);
        this.dynamoDBMapperWrapper = new DynamoDBMapperWrapper(stage);
    }

    public async insert(game: Game): Promise<boolean> {
        const newGame = new Game();
        Logger.debug('newGame newGame newGame', newGame);

        return this.dynamoDBMapperWrapper.put(newGame, game);
    }

    public async getAll(): Promise<Game[]> {
        const games = await this.dynamoDBMapperWrapper.scan(Game);
        Logger.debug('games games games games', games);
        return [Object.assign(new Game(), games)];
    }

    public async getByID(UUID: string): Promise<Game> {
        const game = await this.dynamoDBMapperWrapper.get(new Game(), { UUID }) as Game;

        return game;
    }

    public async update(game: Game): Promise<Game> {
        const response = await this.dynamoDBMapperWrapper.update(game) as Promise<Game>;

        return response;
    }

    public async delete(UUID: string): Promise<boolean> {
        return this.dynamoDBMapperWrapper.delete(new Game(), { UUID });
    }
}
