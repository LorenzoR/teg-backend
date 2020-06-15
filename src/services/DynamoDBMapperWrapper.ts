import { DataMapper } from '@aws/dynamodb-data-mapper';

import DynamoDB from 'aws-sdk/clients/dynamodb';

class DynamoDBMapperWrapper {
  private DynamoDB = null;

  private mapper: DataMapper;

  constructor(stage: string) {
    console.log('Stage', stage);
    if (stage === 'local') {
      this.DynamoDB = new DynamoDB({
        region: 'localhost',
        endpoint: 'http://localhost:8000',
        accessKeyId: 'DEFAULT_ACCESS_KEY', // needed if you don't have aws credentials at all in env
        secretAccessKey: 'DEFAULT_SECRET', // needed if you don't have aws credentials at all in env
      });

      this.mapper = new DataMapper({
        client: this.DynamoDB,
        // client: new DynamoDB({ region: 'ap-southeast-2' }), // the SDK client used to execute operations
        tableNamePrefix: 'local-', // optionally, you can provide a table prefix to keep your dev and prod tables separate
      });
    } else {
      this.DynamoDB = new DynamoDB.DocumentClient({
        region: 'ap-southeast-2',
      });
    }
  }

  public async put(element: {}, attributes: Record<string, any>): Promise<boolean> {
    // const game = new Game();
    const toSave = Object.assign(element, attributes);

    try {
      const response = await this.mapper.put(toSave);

      return true;
    } catch (error) {
      console.error('ERROR', error);
      return false;
    }
  }

  public async get(element: {}, key: Record<string, any>): Promise<Record<string, any> | null> {
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

  public async delete(element: {}, key: Record<string, any>): Promise<boolean> {
    if (!key) {
      return null;
    }

    try {
      const response = await this.mapper.delete(Object.assign(element, key));
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
}

export default DynamoDBMapperWrapper;
