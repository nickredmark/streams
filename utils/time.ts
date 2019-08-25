import moment from "moment";

export const formatTime = (timestamp: number) => {
    if (moment().subtract(1, 'day') < moment(timestamp)) {
        return moment(timestamp).fromNow();
    }

    return moment(timestamp).format('YYYY-MM-DD HH:mm')
}


export const getStreamTimestamp = (stream: any) => stream._['>'].lastMessage || stream._['>'].name

export const streamComparator = (streams) => (a, b) => {
    return getStreamTimestamp(streams[b]) - getStreamTimestamp(streams[a]);
}