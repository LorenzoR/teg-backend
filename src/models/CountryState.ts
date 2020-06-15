import {
  attribute,
} from '@aws/dynamodb-data-mapper-annotations';
import { embed } from '@aws/dynamodb-data-mapper';

import Player from './Player';

class CountryState {
  @attribute({ memberType: embed(Player) })
  player: Player;

  @attribute()
  troops: number;

  @attribute()
  newTroops: number; // To keep track of troops added during ADD_TROOPS round
}

export default CountryState;
