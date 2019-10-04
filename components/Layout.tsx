import Head from 'next/head'

export const Layout = ({ title, children }) => (
  <div style={{
    display: "flex",
    height: "100%",
    flexDirection: "column"
  }}>
    <Head>
      <link href="https://fonts.googleapis.com/css?family=Open Sans&display=swap" rel="stylesheet" />
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
          font-family: 'Open Sans', sans;
        }
        #__next {
          height: 100%;
        }

        img, video {
          display: block;
          max-width: 100%;
          margin: auto;
        }

        .markdown {
          display: inline;
        }
        .markdown p {
          display: inline;
          margin: 0;
        }

        header {
          padding: 0.5rem;
          border-bottom: 1px solid lightgray;
          width: 100%;
        }
        h1 {
          margin: 0;
          font-size: 1.5rem;
          display: block;
          margin: auto;
          max-width: 35rem;
          width: 100%;
        }
        .body-wrapper {
          display: flex;
          flex-grow: 1;
          flex-shrink: 1;
          min-height: 0;
          position: relative;
        }
        .body {
          flex-grow: 1;
          flex-shrink: 1;
          min-height: 0;
          overflow-y: scroll;
          width: 100%;
          overflow-x: hidden;
        }
        .body-content {
          padding: 0.5rem;
        }
        .content {
          margin: auto;
          max-width: 35rem;
          width: 100%;
          line-height: 1.5;
        }
        @media only screen and (min-width: 35rem) {
          .body-content {
            margin-left: calc(100vw - 100%);
          }
        }

        ul {
          list-style: none;
          padding: 0;
        }

        .message {
          margin-bottom: 0.5rem;
        }
        hr {
          margin-top: 0.5rem;
          border-top: none;
          border-bottom: 1px solid lightgray;
        }

        .player-wrapper {
          position: relative;
          padding-top: 56.25% /* Player ratio: 100 / (1280 / 720) */
        }
         
        .react-player {
          position: absolute;
          top: 0;
          left: 0;
        }

        twitter-widget {
          margin: auto;
        }
      `}
    </style>
    {children}
  </div>
)
