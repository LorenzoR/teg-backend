import { Player } from './Player';

export interface CountryType {
  countryKey: string;
  name: string;
  state: {
    player: Player;
    troops: number;
    newTroops: number; // To keep track of troops added during ADD_TROOPS round
  };
}
