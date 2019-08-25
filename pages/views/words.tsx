import { getStreams, Message } from "../../services/Streams";
import { Component } from "react";
import Layout from "../../components/Layout";
import { pick } from 'lodash';
import { commonWords } from "../../utils/words";
import WordCloud from 'react-d3-cloud';

class Statistics extends Component<{}, { messages: { [key: string]: Message }, done: boolean }> {
    private messages: { [key: string]: Message } = {}
    constructor(props) {
        super(props)
        this.state = {
            messages: {},
            done: false
        }
    }
    async componentDidMount() {
        (await getStreams()).onAnyMessage((message, key) => {
            if (message) {
                this.messages = {
                    ...this.messages,
                    [key]: {
                        ...this.messages[key],
                        ...message
                    }
                }
            } else {
                this.messages = pick(this.messages, Object.keys(this.messages).filter(k => k !== key));
            }
        })

        setTimeout(() => this.setState({
            messages: this.messages,
            done: true,
        }), 1000)
    }

    render() {
        if (!this.state.done) {
            return <div>Loading...</div>
        }

        const words = {}
        for (const message of Object.values(this.state.messages)) {
            for (const w of (message.text || '').toLowerCase().split(/[ ,()\.'":/]+/g).filter(w => w.length > 1 && !commonWords.includes(w))) {
                words[w] = (words[w] ? words[w] : 0) + 1
            }
        }

        const wordlist = Object.keys(words).filter(w => words[w] > 1).sort((a, b) => words[b] === words[a] ? b.length - a.length : words[b] - words[a]);
        const wordsForCloud = wordlist.slice(0, 100).map(word => ({
            text: word,
            value: words[word]
        }));

        return <div>
            <WordCloud data={wordsForCloud} rotate={word => Math.random() * 180 - 90} />
            <ul>{wordlist.map(word => <li key={word}>{word}: {words[word]}</li>)}</ul></div>
    }
}

export default () => (<Layout><Statistics /></Layout>)