import { GunEntity, getId } from './secure';

export type Node<T> = {
  index: number;
  parent?: Node<T>;
  entity?: T;
  children: Node<T>[];
};

export type WithParent = {
  parent?: {
    '#': string;
  };
};

const getParentKey = (o: WithParent) => o.parent && o.parent['#'] || '';

export const treeify = <T extends GunEntity & WithParent>(entities: T[], linear?: boolean): Node<T>[] => {
  const nodesByKey: { [key: string]: Node<T> } = {
    '': {
      index: 0,
      entity: null,
      children: [],
    }
  };
  const ensureNode = (key: string) => {
    if (!nodesByKey[key]) {
      nodesByKey[key] = {
        index: 0,
        children: [],
      };
    }
  };
  const append = (parent: Node<T>, node: Node<T>) => {
    node.parent = parent;
    node.index = parent.children.length;
    parent.children.push(node);
  }

  for (const entity of entities) {
    const key = getId(entity);
    ensureNode(key);
    nodesByKey[key].entity = entity;
    const parent = linear ? '' : getParentKey(entity);
    ensureNode(parent);
    append(nodesByKey[parent], nodesByKey[key]);
  }

  return nodesByKey[''].children;
};
