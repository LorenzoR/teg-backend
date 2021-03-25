import { attribute } from '@aws/dynamodb-data-mapper-annotations';

export const RoundType = {
    FIRST_ADD_TROOPS: 'firstAddTroops',
    SECOND_ADD_TROOPS: 'secondAddTroops',
    ATTACK: 'attack',
    MOVE_TROOPS: 'moveTroops',
    ADD_TROOPS: 'addTroops',
    GET_CARD: 'getCard',
};

class Round {
  @attribute()
  public count: number;

  @attribute()
  public type = RoundType.FIRST_ADD_TROOPS;

  @attribute()
  public playerIndex: number;
}

export default Round;
