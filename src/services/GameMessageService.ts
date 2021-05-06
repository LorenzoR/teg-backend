import { Game } from '@src/models';
import { Logger } from '@src/utils';
import { APIGatewayWebsocketsServiceInterface } from './APIGatewayWebsocketsServiceInterface';
import { GameRepositoryInterface } from './GameRepositoryInterface';
import { GameMessageServiceInterface } from './GameMessageServiceInterface';

export class GameMessageService implements GameMessageServiceInterface {
    private apiGatewayWebsocketsService: APIGatewayWebsocketsServiceInterface;

    private gameRepository: GameRepositoryInterface;

    public constructor(input: {
        apiGatewayWebsocketsService: APIGatewayWebsocketsServiceInterface;
        gameRepository: GameRepositoryInterface;
    }) {
        this.apiGatewayWebsocketsService = input.apiGatewayWebsocketsService;
        this.gameRepository = input.gameRepository;
    }

    public async sendGameInfoToAllPlayers(game: Game): Promise<boolean> {
        if (!game) {
            return null;
        }

        Logger.debug('sending game info to players');
        const promises = [];

        game.players.forEach((player) => {
            const payload = { action: 'sync', body: { ...game, currentPlayerId: player.id } };

            promises.push(this.apiGatewayWebsocketsService.send(player.id, JSON.stringify(payload)));
        });

        try {
            await Promise.all(promises);
            return true;
        } catch (error) {
            Logger.error(error);
            return false;
        }
    }

    public async sendConnectionIdToEachPlayer(gameId: string): Promise<boolean> {
        const game = await this.gameRepository.getByID(gameId);

        if (!game || !game.players) {
            return null;
        }

        Logger.debug('sending to each player');
        const promises = [];

        game.players.forEach((player) => {
            const connectionId = player.id;
            const body = { connectionId, color: player.color };
            const data = { body, action: 'connectionId' };
            promises.push(this.apiGatewayWebsocketsService.send(connectionId, JSON.stringify(data)));
        });

        const response = await Promise.all(promises);

        return response && response.length === game.players.length;
    }

    public async sendGameInfoToEachPlayer(game: Game): Promise<boolean> {
        const data = [];

        // Get online players
        const onlinePlayers = game.getOnlinePlayers();

        // Mask data so that players don't get other player's details
        const connectionIds = onlinePlayers.map((o) => o.id);

        connectionIds.forEach((connectionId) => {
            const playerDetails = { ...game };
            playerDetails.players = JSON.parse(JSON.stringify(playerDetails.players)); // Copy players

            playerDetails.players.forEach((player) => {
                if (player.id !== connectionId) {
                    // eslint-disable-next-line no-param-reassign
                    player.mission = null;
                }
            });

            data.push(JSON.stringify({ action: 'gameStarted', body: playerDetails }));
        });

        try {
            let updateGame = false;
            const responses = await this.apiGatewayWebsocketsService.broadcastDifferentData(data, connectionIds);

            // Set player offline if response is false
            responses.forEach((response) => {
                if (!response.response) {
                    const player = game.getPlayerById(response.id);
                    if (player) {
                        Logger.debug(`Set player ${player.id} to offline`);
                        player.playerStatus = 'offline';
                        updateGame = true;
                    }
                }
            });

            if (updateGame) {
                await this.gameRepository.update(game);
            }

            return true;
        } catch (error) {
            Logger.error(error);
            return false;
        }
    }
}
