import { JsonDB } from 'node-json-db';
import { Config } from 'node-json-db/dist/lib/JsonDBConfig';
import { Game } from '@src/models';
import { Logger } from '@src/utils';
import { GameRepositoryInterface } from '../../services/GameRepositoryInterface';

export class GameRepositoryMock implements GameRepositoryInterface {
    private isCalled = false;

    private jsonDB: JsonDB;

    public constructor() {
        this.jsonDB = new JsonDB(new Config('/tmp/myTestDataBase', true, true, '/'));
    }

    public async insert(game: Game): Promise<boolean> {
        this.called(`insert with ${game}`);
        this.jsonDB.push(`/game-${game.UUID}`, game);

        return true;
    }

    public async getAll(): Promise<Game[]> {
        this.called('getAll');
        return [];
    }

    public async getByID(UUID: string): Promise<Game> {
        this.called(`getByID with ${UUID}`);

        const game = Object.assign(new Game(), this.jsonDB.getData(`/game-${UUID}`));

        return game;
    }

    public async update(game: Game): Promise<Game> {
        this.called('update');
        this.jsonDB.push(`/game-${game.UUID}`, game);
        return game;
    }

    public async delete(UUID: string): Promise<boolean> {
        this.called(`delete with ${UUID}`);
        this.jsonDB.delete(`/game-${UUID}`);
        return true;
    }

    private called(message: string) {
        this.isCalled = true;
        Logger.debug(`Called ${this.isCalled} with message`, message);
    }
}
