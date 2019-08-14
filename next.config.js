require("dotenv").config();

module.exports = {
    env: {
        NAMESPACE: process.env.NAMESPACE,
        STREAMS: process.env.STREAMS,
        READONLY: process.env.READONLY,
    }
}
