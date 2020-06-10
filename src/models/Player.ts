/* eslint-disable import/extensions */
import { Mission } from './Mission';

export interface Player {
  id: string;
  name: string;
  color: string;
  troopsToAdd?: { free: number };
  mission?: Mission;
  cards?: Array<any>;
  canGetCard?: boolean;
  cardExchangesCount?: number;
  isAdmin?: boolean;
}

export const PlayerTypes = {
  BLUE: 'blue',
  RED: 'red',
  GREEN: 'green',
  YELLOW: 'yellow',
  BLACK: 'black',
  PINK: 'pink',
};
