import DynamoDBMapperWrapper from './DynamoDBMapperWrapper';
import Game from '../models/Game';
import Player from '../models/Player';
import Country from '../models/Country';
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
    return [new Game()];
    // throw new Error('Method not implemented.');
  }

  public async getByID(UUID: string): Promise<Game> {
    const game = await this.dynamoDBMapperWrapper.get(new Game(), { UUID }) as Game;

    return game;
  }

  public async getByID22(UUID: string): Promise<Game> {
    const getResponse = await this.dynamoDBMapperWrapper.get(new Game(), { UUID });
    const game = JSON.parse(JSON.stringify(getResponse));

    console.log('getResponse', getResponse);
    console.log('game', game);
    console.log('game stringify', JSON.stringify(game));
    console.log('getresponse stringify', JSON.stringify(getResponse));

    if (!game) {
      return null;
    }

    const attributes = [
      { key: 'guestsss', obj: (): Player => new Player() },
      { key: 'playersss', obj: (): Player => new Player() },
      { key: 'playerss', obj: (): Player => new Player() },
      { key: 'countriesss', obj: (): Country => new Country() },
    ];

    console.log(game.countries[0]);

    attributes.forEach((attribute) => {
      if (game[attribute.key]) {
        if (Array.isArray(game[attribute.key]) && game[attribute.key].length > 0) {
          const castedAttributes = [];
          game[attribute.key].forEach((gameAttribute) => {
            // eslint-disable-next-line no-param-reassign
            const newObject = Object.assign(attribute.obj(), JSON.parse(JSON.stringify(gameAttribute)));
            castedAttributes.push(newObject);
            // castedPlayers.push(Object.assign(attribute.obj, gameAttribute));
          });
          game[attribute.key] = castedAttributes;
        } else {
          game[attribute.key] = Object.assign(attribute.obj, game[attribute.key]);
        }
      }
    });

    /*
    // Cast all properties
    if (game.players) {
      const castedPlayers = [];

      game.players.forEach((player) => {
        castedPlayers.push(new Player(), player);
      });

      game.players = castedPlayers;
    }

    if (game.guests) {
      const castedGuest = [];

      game.guests.forEach((guest) => {
        castedGuest.push(new Player(), guest);
      });

      game.guests = castedGuest;
    }

    if (game.countries) {
      const castedCountries = [];

      game.countries.forEach((country) => {
        castedCountries.push(new Country(), country);
      });

      game.countries = castedCountries;
    }
    */

    const gameResponse: Game = Object.assign(new Game(), game);

    console.log('gameResponse', gameResponse);
    console.log('gameResponse-players', gameResponse.players);

    // return game;
    return gameResponse;
  }

  public async update(game: Game): Promise<Game> {
    // const game = await this.getByID(game.UUID);
    const response = await this.dynamoDBMapperWrapper.update(game);

    return response;
    // throw new Error('Method not implemented.');
  }

  public async delete(UUID: string): Promise<boolean> {
    return this.dynamoDBMapperWrapper.delete(new Game(), { UUID });
  }
}

export default DynamoDBGameRepository;
