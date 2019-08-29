import { Message } from '../services/Streams';

type Tree = {
  message: Message;
  children: Tree[][];
};

const messagesToTrees = (messages: Message[]): Tree[] => {
  const trees: Tree[] = [];
  const rootMessages = messages.filter(m => !m.parent);
  for (const message of rootMessages) {
    trees.push(messageToTree(message, messages));
  }
  return trees;
};

const messageToTree = (message: Message, messages: Message[]): Tree => {
  const tree: Tree = {
    message,
    children: [] as Tree[][],
  };

  for (const subMessage of messages.filter(m => m.parent['#'] === message._["#"])) {
    const 
    tree.children.push()
  }
  return tree;
};
