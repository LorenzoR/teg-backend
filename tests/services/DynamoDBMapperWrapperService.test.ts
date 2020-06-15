import Game from '../../src/models/Game';
import Player from '../../src/models/Player';
import Country from '../../src/models/Country';

import DynamoDBMapperWrapper from '../../src/services/DynamoDBMapperWrapper';

const dynamoDBMapperWrapper = new DynamoDBMapperWrapper('local');

describe('dynamoDB mapper wrapper service', () => {
  it('can insert a game', async () => {
    expect.hasAssertions();

    const player1 = new Player();
    player1.id = '1';

    const player2 = new Player();
    player2.id = '2';

    const country1 = new Country();
    country1.countryKey = 'ARGENTINA';

    const country2 = new Country();
    country2.countryKey = 'BRASIL';

    const game = new Game();
    const params = {
      UUID: '1',
      player: player1,
      players: [
        player1,
        player2,
      ],
      countries: {
        ARGENTINA: { countryKey: 'ARGENTINA' },
        BRASIL: { countryKey: 'BRASIL' },
      },
    };

    const response = await dynamoDBMapperWrapper.put(game, params);

    expect(response).toBe(true);
  });

  it('can get a game', async () => {
    expect.hasAssertions();

    const key = { UUID: '1' };
    const response = await dynamoDBMapperWrapper.get(new Game(), key);

    console.log('holaaaa');

    const anotherPlayer = new Player();

    const player = Object.assign(new Player(), response.players[0]);

    console.log('player', player);
    // console.log('asdasadasdas', player.playerIsAdmin());

    expect(response.UUID).toBe(key.UUID);
  });

  it('can update a game', async () => {
    expect.hasAssertions();

    const key = { UUID: '1' };
    const game = await dynamoDBMapperWrapper.get(new Game(), key);
    game.gameStatus = 'finished';

    const updateResponse = await dynamoDBMapperWrapper.update(game);

    console.log('updateResponse', updateResponse);

    const getResponse = await dynamoDBMapperWrapper.get(new Game(), key);

    expect(getResponse.gameStatus).toBe(game.gameStatus);
  });

  it('can delete a game', async () => {
    expect.hasAssertions();

    const key = { UUID: '1' };

    const response = await dynamoDBMapperWrapper.delete(new Game(), key);

    console.log('deleteResponse', response);

    const getResponse = await dynamoDBMapperWrapper.get(new Game(), key);

    expect(getResponse).toBeNull();
  });
});
