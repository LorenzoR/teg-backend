import { AWSError, DynamoDB } from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';

export interface DynamoDBRepositoryInterface {
    put: (
        params: DynamoDB.DocumentClient.PutItemInput,
    ) => Promise<PromiseResult<DynamoDB.DocumentClient.PutItemOutput, AWSError>>;
    scan: (params: DynamoDB.DocumentClient.ScanInput) => Promise<PromiseResult<DynamoDB.DocumentClient.ScanOutput, AWSError>>;
    get: (
        tableName: string,
        key: DynamoDB.DocumentClient.GetItemInput['Key'],
    ) => Promise<PromiseResult<DynamoDB.DocumentClient.GetItemOutput, AWSError>>;
    update: (
        tableName: string,
        key: DynamoDB.DocumentClient.UpdateItemInput['Key'],
        updateExpression: DynamoDB.DocumentClient.UpdateItemInput['UpdateExpression'],
        expressionAttributeValues: DynamoDB.DocumentClient.UpdateItemInput['ExpressionAttributeValues'],
        expressionAttributeNames?: DynamoDB.DocumentClient.UpdateItemInput['ExpressionAttributeNames'],
    ) => Promise<PromiseResult<DynamoDB.DocumentClient.UpdateItemOutput, AWSError>>;
    delete: (
        tableName: string,
        Key: DynamoDB.DocumentClient.DeleteItemInput['Key'],
    ) => Promise<PromiseResult<DynamoDB.DocumentClient.DeleteItemOutput, AWSError>>;
}
