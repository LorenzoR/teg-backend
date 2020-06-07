import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
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
        return false;
      }
    }

    // No connection ID
    return false;
  }

  public async broadcast(data: {}, connectionIds: string[]): Promise<boolean> {
    // Remove duplicates
    const uniqueConnectionIds = [...new Set(connectionIds)];
    const promises = [];

    uniqueConnectionIds.forEach((connectionId) => {
      promises.push(this.send(connectionId, data));
    });

    await Promise.all(promises);

    return true;
  }
}

export default APIGatewayWebsocketsService;
