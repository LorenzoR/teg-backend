import {
    attribute,
    hashKey,
    table,
} from '@aws/dynamodb-data-mapper-annotations';

@table('connection-ids')
class WebSocketConnection {
  @hashKey({
      type: 'String',
  })
  public connectionId?: string;

  @attribute()
  public gameId?: string;
}

export default WebSocketConnection;
