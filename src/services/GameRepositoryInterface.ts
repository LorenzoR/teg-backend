import { Game } from '@src/models';

export interface GameRepositoryInterface {
    insert (game: Game): Promise<boolean>;
    getAll (): Promise<Game[]>;
    getByID (UUID: string): Promise<Game>;
    update (game: Game): Promise<Game>;
    delete (UUID: string): Promise<boolean>;
}
