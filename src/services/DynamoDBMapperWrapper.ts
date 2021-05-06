import { DataMapper, StringToAnyObjectMap } from '@aws/dynamodb-data-mapper';
import { ZeroArgumentsConstructor } from '@aws/dynamodb-data-marshaller';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import { Logger } from '@src/utils';

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

    public async put(element: unknown, attributes: unknown): Promise<boolean> {
        // const game = new Game();
        Logger.debug('element', element);
        Logger.debug('attributes', attributes);
        const toSave = Object.assign(element, attributes);

        Logger.debug('toSave', JSON.stringify(toSave));

        try {
            const response = await this.mapper.put(toSave);

            return !!response;
        } catch (error) {
            Logger.error('ERROR', error);
            return false;
        }
    }

    public async get(element: unknown, key: unknown): Promise<unknown | null> {
        try {
            const response = await this.mapper.get(Object.assign(element, key));
            Logger.debug('RESPONSEEEEE', response);

            return response;
        } catch (error) {
            Logger.error(error);
            return null;
        }
    }

    public async update(item: unknown): Promise<unknown> {
        try {
            const response = await this.mapper.update(item);

            return response;
        } catch (error) {
            Logger.error(error);
            return null;
        }
    }

    public async scan(valueConstructor: ZeroArgumentsConstructor<StringToAnyObjectMap>): Promise<unknown[]> {
        try {
            const iterator = this.mapper.scan(valueConstructor);
            const result = [];

            // eslint-disable-next-line no-restricted-syntax
            for await (const item of iterator) {
                result.push(item);
            }

            return result;
        } catch (error) {
            Logger.error(error);
            return null;
        }
    }

    public async delete(element: unknown, key: unknown): Promise<boolean> {
        if (!key) {
            return null;
        }

        try {
            const response = await this.mapper.delete(Object.assign(element, key));
            return !!response;
        } catch (error) {
            Logger.error(error);
            return false;
        }
    }
}

export default DynamoDBMapperWrapper;
