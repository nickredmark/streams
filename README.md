# Streams

## Use locally

### Setup

Create a `.env` file:

```
SERVERS=https://gunjs.herokuapp.com/gun
```

```
npm i
```

### Start

```
npm run dev
```

## Deploy with now

Create a `now.json` file:

```
{
    "build": {
        "env": {
            "SERVERS": "https://gunjs.herokuapp.com/gun"
        }
    }
}
```

Deploy:

```
now
```
