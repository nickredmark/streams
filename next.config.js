require("dotenv").config();

module.exports = {
  env: {
    SERVERS: process.env.SERVERS,
    NAMESPACE: process.env.NAMESPACE,
    STREAMS: process.env.STREAMS,
    READONLY: process.env.READONLY
  }
};
