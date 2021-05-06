import DynamoDBService from '../DynamoDBService';

describe('dynamoDB service', () => {
    it('can scan table', async () => {
        expect.hasAssertions();

        const dynamoDBService = new DynamoDBService('local');

        const result = await dynamoDBService.scan({
            TableName: 'local-teg-games',
        });

        expect(result).toBeDefined();
        expect(1).toBe(1);
    });

    it('can scan another table', async () => {
        expect.hasAssertions();

        const dynamoDBService = new DynamoDBService('local');

        const result = await dynamoDBService.scan({
            TableName: 'local-connection-ids',
        });

        expect(result).toBeDefined();
        expect(1).toBe(1);
    });
});
