# Streams

## Use locally

### Setup

Create a `.env` file:

```
SERVERS=https://gunjs.herokuapp.com/gun
```

Pick a namespace that nobody is likely to use (a uuid?)

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
            "NAMESPACE": "<yournamespace>"
        }
    }
}
```

Deploy:

```
now
```
