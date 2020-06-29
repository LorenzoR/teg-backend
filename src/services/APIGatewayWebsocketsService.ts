// import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { ApiGatewayManagementApi } from 'aws-sdk';

class APIGatewayWebsocketsService {
  private apigwManagementApi!: ApiGatewayManagementApi;

  public constructor(endpoint: string, apiVersion = '2018-11-29') {
    this.apigwManagementApi = new ApiGatewayManagementApi({
      apiVersion,
      endpoint,
    });
  }

  public setEndpoint(endpoint: string, apiVersion = '2018-11-29'): void {
    this.apigwManagementApi = new ApiGatewayManagementApi({
      apiVersion,
      endpoint,
    });
  }

  public async send(connectionId: string, data: {}): Promise<boolean> {
    if (connectionId) {
      try {
        await this.apigwManagementApi
          .postToConnection({ ConnectionId: connectionId, Data: data })
          .promise();

        return true;
      } catch (error) {
        console.error('APIGatewayWebsocketsService::send ERROR', error.message);
        return false;
      }
    }

    // No connection ID
    return false;
  }

  public async broadcast(data: {}, connectionIds: string[]): Promise<{ id: string; response: boolean } []> {
    // Remove duplicates
    const uniqueConnectionIds = [...new Set(connectionIds)];
    const promises = [];

    uniqueConnectionIds.forEach((connectionId) => {
      promises.push(this.send(connectionId, data));
    });

    const promiseResponse = await Promise.all(promises);

    const response: { id: string; response: boolean } [] = [];

    promiseResponse.forEach((aResponse, index) => {
      response.push({ id: uniqueConnectionIds[index], response: aResponse });
    });

    console.log('Broadcast response', response);

    return response;
  }

  public async broadcastDifferentData(data: {}[], connectionIds: string[]): Promise<{ id: string; response: boolean } []> {
    // Remove duplicates
    const uniqueConnectionIds = [...new Set(connectionIds)];
    const promises = [];

    uniqueConnectionIds.forEach((connectionId, index) => {
      promises.push(this.send(connectionId, data[index]));
    });

    const promiseResponse = await Promise.all(promises);

    const response: { id: string; response: boolean } [] = [];

    promiseResponse.forEach((aResponse, index) => {
      response.push({ id: uniqueConnectionIds[index], response: aResponse });
    });

    console.log('BroadcastDifferentData response', response);

    return response;
  }
}

export default APIGatewayWebsocketsService;
