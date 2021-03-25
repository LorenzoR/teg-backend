import { attribute } from '@aws/dynamodb-data-mapper-annotations';

class EventsLog {
    @attribute()
    public type: string;

    @attribute()
    public text: string;

    @attribute()
    public playerColor: string;

    @attribute()
    public time: number;
}

export default EventsLog;
