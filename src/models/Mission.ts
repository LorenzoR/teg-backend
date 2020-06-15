import {
  attribute,
} from '@aws/dynamodb-data-mapper-annotations';

class Mission {
  @attribute()
  public text?: string;

  @attribute()
  public destroy?: string;

  @attribute()
  public neighbours?: number;

  @attribute()
  public continents?: { id: string; countries: number } [];
}

export default Mission;
