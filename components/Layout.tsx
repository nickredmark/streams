import Link from "next/link";
import Head from 'next/head'
import { Component, useRef } from "react";
import { StreamsService, getStreams } from "../services/Streams";

const LOGIN_REQUIRED = false;

export default class extends Component<{}, { initialized: boolean, logged: boolean }> {
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
      logged: !!this.streams.user.is
    })
  }
  render() {
    return <div style={{
      display: "flex",
      height: "100%",
      flexDirection: "column"
    }}>
      <Head>
        <script src="https://cdn.jsdelivr.net/npm/gun/gun.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/gun/sea.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/gun/lib/webrtc.js"></script>
      </Head>
      <style jsx global>
        {`
        * {
          box-sizing: border-box;
        }
        html {
          height: 100%;
        }
        body {
          height: 100%;
          margin: 0;
          font-family: sans-serif;
        }
        #__next {
          height: 100%;
        }

        img, video {
          max-width: 30rem;
        }

        .markdown {
          display: inline;
        }
        .markdown p {
          display: inline;
          margin: 0;
        }
      `}
      </style>
      <div>
        <Link href="/">
          <a style={{
            display: "block",
            margin: '0.5rem',
            textDecoration: "none",
          }}>home</a>
        </Link>
      </div>
      {(() => {
        if (!this.state.initialized) {
          return <div>Initializing...</div>
        }

        if (LOGIN_REQUIRED && !this.state.logged) {
          return <Login onLogin={() => this.setState({ logged: true })} />
        }

        return <div style={{ display: 'flex', flexDirection: "column", flexGrow: 1, flexShrink: 1, minHeight: 0 }}>{this.props.children}</div>
      })()}
    </div>
  }
}

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