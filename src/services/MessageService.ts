import { ApiGatewayManagementApi } from 'aws-sdk';
import { Logger } from '@src/utils';
import { GameService } from './GameService';
import { APIGatewayWebsocketsService } from './APIGatewayWebsocketsService';
import { DynamoDBGameRepository } from './DynamoDBGameRepository';

interface Dependencies {
  gameService?: GameService;
  apiGatewayWebsocketsService?: APIGatewayWebsocketsService;
}

class MessageService {
    private gameService!: GameService;

    private apiGatewayWebsocketsService!: APIGatewayWebsocketsService;

    public constructor(dependencies: Dependencies) {
        if (dependencies.gameService) {
            this.gameService = dependencies.gameService;
        } else {
            const ynamoDBGameRepository = new DynamoDBGameRepository('local');
            this.gameService = new GameService(ynamoDBGameRepository);
        }
    }

    /*
    public async sendMessageToAllPlayersAndGuests(gameId: string, data: any): Promise<boolean> {
      try {
        await this.sendMessageToAllGuests(gameId, data);
        await this.sendMessageToAllPlayers(gameId, data);

        return true;
      } catch (error) {
        Logger.error(error);
        return false;
      }
    }
    */

    public async sendMessageToAllPlayers(gameId: string, data: ApiGatewayManagementApi.PostToConnectionRequest['Data']): Promise<boolean> {
        const game = await this.gameService.getGame(gameId);

        if (!game) {
            throw new Error(`No game with ID ${gameId}`);
        }

        const connectionIds = [];

        if (game.players) {
            Logger.debug('sending to players');
            game.players.forEach((player) => {
                connectionIds.push(player.id);
            });
        }

        Logger.debug('sending to players', connectionIds);

        try {
            await this.apiGatewayWebsocketsService.broadcast(data, connectionIds);
            return true;
        } catch (error) {
            Logger.error(error);
            return false;
        }
    }

    /*
    public async sendMessageToAllGuests(gameId: string, data: any): Promise<boolean> {
      const game = await this.gameService.getGame(gameId);

      if (!game) {
        throw new Error(`No game with ID ${gameId}`);
      }

      const connectionIds = [];

      if (game.guests) {
        Logger.debug('sending to guests');
        game.guests.forEach((guest) => {
          connectionIds.push(guest.id);
        });
      }
      Logger.debug('sending to guests', connectionIds);

      try {
        await this.apiGatewayWebsocketsService.broadcast(data, connectionIds);
        return true;
      } catch (error) {
        Logger.error(error);
        return false;
      }
    }
    */
}

export default MessageService;
