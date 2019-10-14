export type GunEntity = {
    _: {
        ['#']?: string;
        get?: string;
    };
    priv: string;
    epriv: string;
    'reader-epriv': string;
};

export type GUN = {
    SEA: SEA;
    state: () => number;
} & ((options: {
    localStorage: boolean,
    peers: string[],
}) => Gun);

export type Gun = {
    get: (key: string) => Gun;
    put: (o: Object, cb?: () => void) => Gun;
    set: (o: Object) => Gun;
    then: () => Promise<Primitive>;
    opt: () => {
        _: {
            opt: {
                uuid: () => string
            }
        }
    }
    on: (listener: (data: any, id: string) => void) => Gun
    map: (listener?: (data: any, id: string) => void) => Gun
};

export type SEA = {
    pair: () => Pair;
    sign: (message: SignedMessage, pair: Pair) => Promise<string>;
    encrypt: (value: Primitive, pair: Pair) => Promise<string>;
    decrypt: (value: Primitive, epriv: string) => Promise<string>;
}

export type SignedMessage = {
    '#': string,
    '.': string,
    ':': Primitive | Link,
    '>': number,
}

export type Link = {
    '#': string
}

export type Pair = {
    priv?: string;
    pub?: string;
    epriv?: string;
    epub?: string;
}

export type Credentials = {
    id: string;
    priv: string;
    pub: string;
    epriv: string;
    epub: string;
    readerEpriv: string;
    readerepub: string;
}

export type Primitive = string | boolean | number;


export const put = async (props: {
    Gun: GUN,
    gun: Gun,
    priv: string,
    epriv: string,
    pub: string,
    sub?: string,
    id?: string,
    key: string,
    value?: Primitive
    link?: string
}) => {
    let { Gun, gun, priv, epriv, id, pub, sub, key, value, link } = props;
    if (!id) {
        if (!pub) {
            throw new Error('Either id or pub are required')
        }
        if (sub) {
            id = `${sub}~${pub}.`
        } else {
            id = `~${pub}`
        }
    }
    if (id.startsWith('SEA')) {
        throw new Error('You are using an encrypted id')
    }
    if (value === undefined) {
        if (link === undefined) {
            throw new Error('Either value or link are required')
        }
        if (link === null) {
            value = null
        } else {
            value = { '#': link } as any
        }
    } else {
        value = await Gun.SEA.encrypt(value, { epriv });
    }
    value = await Gun.SEA.sign({
        '#': id,
        ".": key,
        ':': value,
        '>': Gun.state(),
    }, { priv, pub });
    gun.get(id).get(key).put(value);
}

export const getId = (o: GunEntity) => o && (o._['#'] || o._.get);

export const getPub = (o: GunEntity) => getId(o).slice(1)

export const create = async ({ Gun, gun }: { Gun: GUN, gun: Gun }): Promise<Credentials> => {
    const pair = await Gun.SEA.pair();
    const readerPair = await Gun.SEA.pair();
    const id = `~${pair.pub}`;

    const base = {
        Gun,
        gun,
        priv: pair.priv,
        pub: pair.pub,
        epriv: pair.epriv,
        id
    }
    await put({ ...base, key: 'priv', value: pair.priv });
    await put({ ...base, key: 'epriv', value: pair.epriv });
    await put({ ...base, key: 'reader-epriv', value: readerPair.epriv });

    return {
        id,
        priv: pair.priv,
        pub: pair.pub,
        epriv: pair.epriv,
        epub: pair.epub,
        readerEpriv: readerPair.epriv,
        readerepub: readerPair.epub
    }
}

/*

gun = Gun()
Gun.SEA.pair().then(p => pair = p)
Gun.SEA.sign(Gun.SEA.opt.prep('bar'), pair).then(signature => gun.get(`~${pair.pub}`).get('foo').put(signature))
gun.get(`~${pair.pub}`).once(x => console.log(x))

gun.get('foo').get('x').put('y')
Gun.SEA.sign({
    '#': `~${pair.pub}`,
    '.': 'rel',
    ':': {
        "#": 'foo'
    },
    '>': +new Date()
}, pair).then(signature => {
    gun.get(`~${pair.pub}`).get('rel').put(signature);
});

Gun.SEA.sign({
    '#': `anything~${pair.pub}.`,
    '.': 'rel',
    ':': {
        "#": 'foo'
    },
    '>': +new Date()
}, pair).then(signature => {
    gun.get(`anything~${pair.pub}.`).get('rel').put(signature);
});
*/