import { Game } from '@src/models';
import { Player } from '../../models/Player';
import { gameThreePlayers } from '../../testing/data';

import DynamoDBMapperWrapper from '../DynamoDBMapperWrapper';

const dynamoDBMapperWrapper = new DynamoDBMapperWrapper('local');

const testGame: Game = Object.assign(new Game(), gameThreePlayers);

describe('dynamoDB mapper wrapper service', () => {
    it('can insert a game', async () => {
        expect.hasAssertions();

        const response = await dynamoDBMapperWrapper.put(new Game(), gameThreePlayers);

        expect(response).toBe(true);
    });

    it('can get a game', async () => {
        expect.hasAssertions();

        const key = { UUID: testGame.UUID };
        const response = await dynamoDBMapperWrapper.get(new Game(), key) as Game;

        const player = Object.assign(new Player(), response.players[0]);

        expect(response.UUID).toBe(key.UUID);
        expect(player.id).toBe(testGame.players[0].id);
    });

    it('can update a game', async () => {
        expect.hasAssertions();

        const key = { UUID: testGame.UUID };
        const game = await dynamoDBMapperWrapper.get(new Game(), key) as Game;
        game.gameStatus = 'finished';

        const updateResponse = await dynamoDBMapperWrapper.update(game) as Game;

        const getResponse = await dynamoDBMapperWrapper.get(new Game(), key) as Game;

        expect(updateResponse.UUID).toBe(key.UUID);
        expect(getResponse.gameStatus).toBe(game.gameStatus);
    });

    it('can delete a game', async () => {
        expect.hasAssertions();

        const key = { UUID: testGame.UUID };

        const response = await dynamoDBMapperWrapper.delete(new Game(), key);

        const getResponse = await dynamoDBMapperWrapper.get(new Game(), key);

        expect(response).toBe(true);
        expect(getResponse).toBeNull();
    });
});
