import { AWSError, DynamoDB } from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';
import { Logger } from '@src/utils';

class DynamoDBService {
    private DynamoDB: DynamoDB.DocumentClient = null;

    constructor(stage: string) {
        Logger.debug('Stage', stage);
        if (stage === 'local') {
            this.DynamoDB = new DynamoDB.DocumentClient({
                region: 'localhost',
                endpoint: 'http://localhost:8000',
                accessKeyId: 'DEFAULT_ACCESS_KEY', // needed if you don't have aws credentials at all in env
                secretAccessKey: 'DEFAULT_SECRET', // needed if you don't have aws credentials at all in env
            });
        } else {
            this.DynamoDB = new DynamoDB.DocumentClient({
                region: 'ap-southeast-2',
            });
        }
    }

    public async put(params: DynamoDB.DocumentClient.PutItemInput): Promise<PromiseResult<DynamoDB.DocumentClient.PutItemOutput, AWSError>> {
        const paramsCopy = { ...params };

        try {
            const response = await this.DynamoDB.put(paramsCopy).promise();
            Logger.debug('put response', response);
            return response;
        } catch (error) {
            Logger.debug(error);
            return undefined;
        }
    }

    public async update(
        TableName: string,
        Key: DynamoDB.DocumentClient.UpdateItemInput['Key'],
        UpdateExpression: DynamoDB.DocumentClient.UpdateItemInput['UpdateExpression'],
        ExpressionAttributeValues: DynamoDB.DocumentClient.UpdateItemInput['ExpressionAttributeValues'],
        ExpressionAttributeNames: DynamoDB.DocumentClient.UpdateItemInput['ExpressionAttributeNames'] = null,
    ): Promise<PromiseResult<DynamoDB.DocumentClient.UpdateItemOutput, AWSError>> {
        const params = {
            TableName,
            Key,
            UpdateExpression,
            ExpressionAttributeNames,
            ExpressionAttributeValues,
            ReturnValues: 'UPDATED_NEW',
        };

        try {
            const response = await this.DynamoDB.update(params).promise();

            if (response && response.Attributes) {
                return response;
            }

            // TODO. Handle error
            return null;
        } catch (error) {
            Logger.debug(error);
            return null;
        }
    }

    public async get(
        TableName: string,
        Key: DynamoDB.DocumentClient.GetItemInput['Key'],
    ): Promise<PromiseResult<DynamoDB.DocumentClient.GetItemOutput, AWSError>> {
        const params = {
            TableName,
            Key,
        };

        try {
            const response = await this.DynamoDB.get(params).promise();
            return response;
        } catch (error) {
            Logger.error(error);
            return undefined;
        }
    }

    public async scan(params: DynamoDB.DocumentClient.ScanInput): Promise<PromiseResult<DynamoDB.DocumentClient.ScanOutput, AWSError>> {
        try {
            const response = await this.DynamoDB.scan(params).promise();
            return response;
        } catch (error) {
            Logger.error(error);
            return null;
        }
    }

    public async delete(TableName: string, Key: DynamoDB.DocumentClient.DeleteItemInput['Key']): Promise<PromiseResult<DynamoDB.DocumentClient.DeleteItemOutput, AWSError>> {
        const params = {
            TableName,
            Key,
        };

        try {
            const response = await this.DynamoDB.delete(params).promise();
            return response;
        } catch (error) {
            Logger.error(error);
            return null;
        }
    }
}

export default DynamoDBService;
