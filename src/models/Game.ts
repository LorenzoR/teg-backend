import { Player } from './Player';
// import { Country } from './Country';
import { CountryCardType } from './CountryCard';

export interface Game {
  UUID: string;
  guests?: Player [];
  players?: Player [];
  countries?: { any };
  round: {
    count: number;
    type: string;
    playerIndex: number;
  };
  cards: CountryCardType[];
  activityLog?: string[];
}
