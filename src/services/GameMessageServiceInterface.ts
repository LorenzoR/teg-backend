import { Game } from '@src/models';

export interface GameMessageServiceInterface {
    sendGameInfoToAllPlayers(game: Game): Promise<boolean>;

    sendConnectionIdToEachPlayer(gameId: string): Promise<boolean>;

    sendGameInfoToEachPlayer(game: Game): Promise<boolean>;
}
