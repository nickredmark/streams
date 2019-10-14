import { Component, useRef } from "react";
import { StreamsService, getStreams } from "../services/Streams";
import Head from "next/head";

export class StreamsProvider extends Component<{}, { initialized: boolean, logged: boolean }> {
    private streams: StreamsService;
    constructor(props) {
        super(props)
        this.state = {
            initialized: false,
            logged: false,
        }
    }

    async componentDidMount() {
        this.streams = getStreams();
        await this.streams.init();
        this.setState({
            initialized: true,
        })
    }

    render() {
        return <>
            <Head>
                <script src="https://cdn.jsdelivr.net/npm/gun/gun.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/gun/lib/radix.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/gun/lib/radisk.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/gun/lib/store.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/gun/lib/rindexed.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/gun/sea.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/gun/lib/webrtc.js"></script>
                <title>Initializing...</title>
            </Head>
            {(() => {
                if (!this.state.initialized) {
                    return <div>Initializing...</div>
                }

                return this.props.children
            })()}
        </>
    }
}

/*
const Login = ({ onLogin }) => {
    const username = useRef(null);
    const password = useRef(null);
    return <form
        onSubmit={e => {
            e.preventDefault();
            getStreams().user.create(username.current.value, password.current.value, (e) => {
                if (e) {
                    if (e.err !== "User already created!") {
                        throw e;
                    }
                }
                getStreams().user.auth(username.current.value, password.current.value, (...args) => {
                    onLogin();
                })
            })
        }}
    >
        <input placeholder="username" ref={username} />
        <input placeholder="password" type="password" ref={password} />
        <button>Log in / Register</button>
    </form>
}
*/