import DynamoDBMapperWrapper from './DynamoDBMapperWrapper';
import Game from '../models/Game';
import { GameRepositoryInterface } from './GameRepositoryInterface';

class DynamoDBGameRepository implements GameRepositoryInterface {
  private dynamoDBMapperWrapper!: DynamoDBMapperWrapper;

  public constructor(stage: string) {
    this.dynamoDBMapperWrapper = new DynamoDBMapperWrapper(stage);
  }

  public async insert(game: Game): Promise<boolean> {
    return this.dynamoDBMapperWrapper.put(new Game(), game);
  }

  public async getAll(): Promise<Game[]> {
    const game = await this.dynamoDBMapperWrapper.get(new Game(), { UUID: '1' });
    return [Object.assign(new Game(), game)];
  }

  public async getByID(UUID: string): Promise<Game> {
    const game = await this.dynamoDBMapperWrapper.get(new Game(), { UUID }) as Game;

    return game;
  }

  public async update(game: Game): Promise<Game> {
    const response = await this.dynamoDBMapperWrapper.update(game);

    return response;
  }

  public async delete(UUID: string): Promise<boolean> {
    return this.dynamoDBMapperWrapper.delete(new Game(), { UUID });
  }
}

export default DynamoDBGameRepository;
