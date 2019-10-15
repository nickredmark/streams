import moment from "moment";
import { StreamEntity } from "../services/Streams";

export const formatTime = (timestamp: number) => {
    if (moment().subtract(2, 'day') < moment(timestamp)) {
        return moment(timestamp).fromNow();
    }

    if (moment().subtract(7, 'day') < moment(timestamp)) {
        return moment(timestamp).format('dddd');
    }

    return moment(timestamp).format('YYYY/MM/DD')
}


export const getStreamTimestamp = (stream: StreamEntity, messages) => {
    let lastMessage = messages[stream.lastMessage && stream.lastMessage['#']]
    if (lastMessage && lastMessage.created) {
        return lastMessage.created
    }

    return stream.created
}

export const streamComparator = (streams, messages) => (a, b) => {
    return getStreamTimestamp(streams[b], messages) - getStreamTimestamp(streams[a], messages);
}