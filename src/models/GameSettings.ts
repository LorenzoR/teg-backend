import { attribute } from '@aws/dynamodb-data-mapper-annotations';

class GameSettings {
    @attribute()
    public maxPlayers: number;

    @attribute()
    public turnTime: number;

    @attribute()
    public playWithDestroyMissions: boolean;

    @attribute()
    public isPrivate: boolean;

    @attribute()
    public password: string;
}

export default GameSettings;
