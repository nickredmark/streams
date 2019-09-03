import { getKey, GunEntity } from './ordered-list';

export type Node<T> = {
  entity?: T;
  children: Node<T>[];
};

export type WithParent = {
  parent?: {
    '#': string;
  };
};

const getParentKey = (o: WithParent) => o.parent && o.parent['#'];

export const treeify = <T extends GunEntity & WithParent>(entities: T[]): Node<T>[] => {
  const res: Node<T>[] = [];
  const nodesByKey: { [key: string]: Node<T> } = {};
  const ensureNode = (key: string) => {
    if (!nodesByKey[key]) {
      nodesByKey[key] = {
        children: [],
      };
    }
  };

  for (const entity of entities) {
    const key = getKey(entity);
    ensureNode(key);
    nodesByKey[key].entity = entity;
    const parent = getParentKey(entity);
    if (parent) {
      ensureNode(parent);
      nodesByKey[parent];
    } else {
      res.push(nodesByKey[key]);
    }
  }

  return res;
};
