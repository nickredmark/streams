import { useRef, Component } from "react";
import { useRouter } from "next/router";
import { getStreams, Stream } from "../services/Streams";
import { getKey } from "../utils/ordered-list";
import { StreamsProvider } from "../components/StreamsProvider";
import { Layout } from "../components/Layout";

class Streams extends Component<{}, { streams: { [key: string]: Stream } }> {
  constructor(props) {
    super(props)
    this.state = {
      streams: {}
    }
  }

  async componentDidMount() {
  }

  render() {
    return (
      <StreamsProvider>
        <Layout title="Welcome to Streams!">
          <div style={{
            flexGrow: 1
          }}>

            <h1>Welcome to Streams!</h1>
          </div>
          <NewSpace />
        </Layout>
      </StreamsProvider>
    );
  }
}

const NewSpace = () => {
  const name = useRef(null);
  const router = useRouter();
  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        const spaceName = name.current.value
        name.current.value = ''
        const space = await getStreams().createSpace(spaceName)
        router.push(`/space/${getKey(space)}`);
      }}
    >
      <input ref={name} placeholder="new space" style={{
        width: "100%",
        padding: "1rem",
        borderRadius: "none",
        border: "none",
        borderTop: "1px solid lightgray"
      }} />
    </form>
  );
};

export default Streams;
