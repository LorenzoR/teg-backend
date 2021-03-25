import { attribute } from '@aws/dynamodb-data-mapper-annotations';
import { embed } from '@aws/dynamodb-data-mapper';

import Mission from './Mission';
import CountryCard from './CountryCard';

export interface PlayerType {
    id: string;
    name: string;
    color: string;
    troopsToAdd?: { [key: string]: number };
    mission?: Mission;
    cards?: Array<CountryCard>;
    canGetCard?: boolean;
    cardExchangesCount?: number;
    isAdmin?: boolean;
    playerStatus?: string;
}

export const PlayerTypes = {
    BLUE: 'blue',
    RED: 'red',
    GREEN: 'green',
    YELLOW: 'yellow',
    BLACK: 'black',
    PINK: 'pink',
};

class Player {
    @attribute()
    public id: string;

    @attribute()
    public name?: string;

    @attribute()
    public color?: string;

    @attribute()
    public troopsToAdd?: { [key: string]: number };

    @attribute({ memberType: embed(Mission) })
    public mission?: Mission;

    @attribute()
    public cards?: Array<CountryCard>;

    @attribute()
    public canGetCard?: boolean;

    @attribute()
    public cardExchangesCount?: number;

    @attribute()
    public isAdmin?: boolean;

    @attribute()
    public playerStatus?: string;

    /*
  public playerIsAdmin(): boolean {
    return this.isAdmin;
  }
  */
}

export default Player;
