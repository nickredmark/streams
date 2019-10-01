import Head from 'next/head'

export const Layout = ({ title, children }) => (
  <div style={{
    display: "flex",
    height: "100%",
    flexDirection: "column"
  }}>
    <Head>
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
