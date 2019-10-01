import Head from 'next/head'

export const Layout = ({ title, children }) => (
  <div style={{
    display: "flex",
    height: "100%",
    flexDirection: "column"
  }}>
    <Head>
      <script src="https://cdn.jsdelivr.net/npm/gun/gun.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/gun/lib/radix.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/gun/lib/radisk.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/gun/lib/store.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/gun/lib/rindexed.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/gun/sea.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/gun/lib/webrtc.js"></script>
      <title>{title}</title>
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
    {children}
  </div>
)
