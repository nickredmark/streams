import moment from "moment";

export const formatTime = (timestamp: number) => {
    if (moment().subtract(2, 'day') < moment(timestamp)) {
        return moment(timestamp).fromNow();
    }

    if (moment().subtract(7, 'day') < moment(timestamp)) {
        return moment(timestamp).format('dddd');
    }

    return moment(timestamp).format('YYYY/MM/DD')
}


export const getStreamTimestamp = (stream: any) => stream._['>'].lastMessage || stream._['>'].name

export const streamComparator = (streams) => (a, b) => {
    return getStreamTimestamp(streams[b]) - getStreamTimestamp(streams[a]);
}