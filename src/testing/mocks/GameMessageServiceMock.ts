import { Game } from '@src/models';
import { Logger } from '@src/utils';
import { GameMessageServiceInterface } from '../../services/GameMessageServiceInterface';

export class GameMessageServiceMock implements GameMessageServiceInterface {
    private isCalled = false;

    public async sendGameInfoToAllPlayers(game: Game): Promise<boolean> {
        this.called(`getAll with game ${game}`);

        return true;
    }

    public async sendConnectionIdToEachPlayer(gameId: string): Promise<boolean> {
        this.called(`sendConnectionIdToEachPlayer with game ${gameId}`);

        return true;
    }

    public async sendGameInfoToEachPlayer(game: Game): Promise<boolean> {
        this.called(`sendGameInfoToEachPlayer with game ${game}`);

        return true;
    }

    private called(message: string) {
        this.isCalled = true;
        Logger.debug(`Called ${this.isCalled} with message`, message);
    }
}
