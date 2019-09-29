import { Component } from 'react';
import { getStreams, Message } from '../services/Streams';
import { Mermaid } from './Mermaid';

export class Chart extends Component<
  { streamId: string },
  {
    messages: { [key: string]: Message };
  }
  > {
  constructor(props) {
    super(props);
    this.state = {
      messages: {},
    };
  }

  async componentDidMount() {
    getStreams().onMessages(this.props.streamId, batch => {
      this.setState(state => {
        const messages = { ...state.messages };
        for (const { data, key } of batch) {
          if (data) {
            messages[key] = {
              ...messages[key],
              ...data,
            };
          } else {
            delete messages[key];
          }
        }
        return { messages };
      });
    });
  }

  render() {
    const { messages } = this.state;
    const lines = [];
    const ids = {};
    for (const { text } of Object.values(messages)) {
      const match = /^([\w ]+?) *--> *([\w ]+)$/.exec(text);
      const getId = str => {
        if (!ids[str]) {
          ids[str] = `id${Math.floor(Math.random() * 100000000)}`;
        }
        return ids[str];
      };
      if (match) {
        lines.push(`${getId(match[1])}[${match[1]}] --> ${getId(match[2])}[${match[2]}]`);
      }
    }
    return lines.length > 0 ? (
      <Mermaid chart={`graph LR;\n${lines.map(line => `${line};`).join('\n')}`} />
    ) : (
        <em>Chart is empty, try adding relationship messages like "A --> B".</em>
      );
  }
}
