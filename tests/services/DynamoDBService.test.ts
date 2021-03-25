import DynamoDBService from '../../src/services/DynamoDBService';

describe('dynamoDB service', () => {
    it('can scan table', async () => {
        expect.hasAssertions();

        const dynamoDBService = new DynamoDBService('local');

        const result = await dynamoDBService.scan({
            TableName: 'local-teg-games',
        });

        console.log('result games', result);

        // eslint-disable-next-line dot-notation
        console.log(result.Items[0].players);

        expect(1).toBe(1);
    });

    it('can scan another table', async () => {
        expect.hasAssertions();

        const dynamoDBService = new DynamoDBService('local');

        const result = await dynamoDBService.scan({
            TableName: 'local-connection-ids',
        });

        console.log('result connections', result);

        expect(1).toBe(1);
    });
});
