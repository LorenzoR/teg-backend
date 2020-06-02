import { DynamoDB } from 'aws-sdk';

class DynamoDBOffline {
  private DynamoDB = null;

  constructor() {
    this.DynamoDB = new DynamoDB.DocumentClient({
      region: 'localhost',
      endpoint: 'http://localhost:8000',
      accessKeyId: 'DEFAULT_ACCESS_KEY', // needed if you don't have aws credentials at all in env
      secretAccessKey: 'DEFAULT_SECRET', // needed if you don't have aws credentials at all in env
    });
  }

  public async put(tableName: string, params: any): Promise<boolean> {
    try {
      const response = await this.DynamoDB.put(params).promise();
      console.log('put response', response);
      return response;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  public async update(TableName: string, Key: any, UpdateExpression: any, ExpressionAttributeValues: any): Promise<boolean> {
    const params = {
      TableName,
      Key,
      UpdateExpression,
      ExpressionAttributeValues,
      ReturnValues: 'UPDATED_NEW',
    };

    try {
      const response = await this.DynamoDB.update(params).promise();

      if (response && response.Attributes) {
        return response.Attributes;
      }

      // TODO. Handle error
      return null;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  public async get(TableName: string, Key: {}): Promise<boolean> {
    const params = {
      TableName,
      Key,
    };

    try {
      const response = await this.DynamoDB.get(params).promise();
      return response;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  public async scan(tableName: string, params: any): Promise<boolean> {
    try {
      const response = await this.DynamoDB.scan(params).promise();
      return response;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  public async delete(TableName: string, Key: {}): Promise<boolean> {
    const params = {
      TableName,
      Key,
    };

    try {
      const response = await this.DynamoDB.delete(params).promise();
      return response;
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}

export default DynamoDBOffline;
