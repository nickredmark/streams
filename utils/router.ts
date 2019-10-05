
import { stringify } from 'querystring';

export const goTo = (router) => (newQuery: any) => {
    router.replace(
        `${router.pathname}${qstringify({ ...router.query, ...newQuery })}`,
        `${location.pathname}${qstringify({ ...router.query, ...newQuery, id: undefined })}`,
    );
};


export const qstringify = o => {
    const s = stringify(clear(o));
    if (s) {
        return `?${s}`;
    }
    return '';
};

const clear = o => (Object.keys(o).forEach(key => o[key] === undefined && delete o[key]), o);
