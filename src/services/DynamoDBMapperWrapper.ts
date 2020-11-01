import { DataMapper } from '@aws/dynamodb-data-mapper';

import DynamoDB from 'aws-sdk/clients/dynamodb';

class DynamoDBMapperWrapper {
    private DynamoDB = null;

    private mapper: DataMapper;

    constructor(stage: string) {
        if (stage === 'local') {
            this.DynamoDB = new DynamoDB({
                region: 'localhost',
                endpoint: 'http://localhost:8000',
                accessKeyId: 'DEFAULT_ACCESS_KEY', // needed if you don't have aws credentials at all in env
                secretAccessKey: 'DEFAULT_SECRET', // needed if you don't have aws credentials at all in env
            });
        } else {
            this.DynamoDB = new DynamoDB({
                region: 'ap-southeast-2',
            });
        }

        this.mapper = new DataMapper({
            client: this.DynamoDB,
            // the SDK client used to execute operations
            // client: new DynamoDB({ region: 'ap-southeast-2' }),
            // optionally, you can provide a table prefix to keep your dev and prod tables separate
            tableNamePrefix: `${stage}-`,
        });
    }

    public async put(element: any, attributes: Record<string, any>): Promise<boolean> {
        // const game = new Game();
        const toSave = Object.assign(element, attributes);

        try {
            const response = await this.mapper.put(toSave);

            return !!response;
        } catch (error) {
            console.error('ERROR', error);
            return false;
        }
    }

    public async get(element: any, key: Record<string, any>): Promise<Record<string, any> | null> {
        try {
            const response = await this.mapper.get(Object.assign(element, key));

            return response;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    public async update(item: any): Promise<any> {
        try {
            const response = await this.mapper.update(item);

            return response;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    public async scan(params: any): Promise<boolean> {
        try {
            const response = await this.DynamoDB.scan(params).promise();
            return response;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    public async delete(element: any, key: Record<string, any>): Promise<boolean> {
        if (!key) {
            return null;
        }

        try {
            const response = await this.mapper.delete(Object.assign(element, key));
            return !!response;
        } catch (error) {
            console.error(error);
            return false;
        }
    }
}

export default DynamoDBMapperWrapper;
