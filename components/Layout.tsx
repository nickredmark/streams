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
        /* open-sans-300 - latin */
        @font-face {
          font-family: 'Open Sans';
          font-style: normal;
          font-weight: 300;
          src: local('Open Sans Light'), local('OpenSans-Light'),
              url('/fonts/open-sans-v17-latin-300.woff2') format('woff2'), /* Chrome 26+, Opera 23+, Firefox 39+ */
              url('/fonts/open-sans-v17-latin-300.woff') format('woff'); /* Chrome 6+, Firefox 3.6+, IE 9+, Safari 5.1+ */
        }
        
        /* open-sans-regular - latin */
        @font-face {
          font-family: 'Open Sans';
          font-style: normal;
          font-weight: 400;
          src: local('Open Sans Regular'), local('OpenSans-Regular'),
              url('/fonts/open-sans-v17-latin-regular.woff2') format('woff2'), /* Chrome 26+, Opera 23+, Firefox 39+ */
              url('/fonts/open-sans-v17-latin-regular.woff') format('woff'); /* Chrome 6+, Firefox 3.6+, IE 9+, Safari 5.1+ */
        }
        
        /* open-sans-300italic - latin */
        @font-face {
          font-family: 'Open Sans';
          font-style: italic;
          font-weight: 300;
          src: local('Open Sans Light Italic'), local('OpenSans-LightItalic'),
              url('/fonts/open-sans-v17-latin-300italic.woff2') format('woff2'), /* Chrome 26+, Opera 23+, Firefox 39+ */
              url('/fonts/open-sans-v17-latin-300italic.woff') format('woff'); /* Chrome 6+, Firefox 3.6+, IE 9+, Safari 5.1+ */
        }
        
        /* open-sans-italic - latin */
        @font-face {
          font-family: 'Open Sans';
          font-style: italic;
          font-weight: 400;
          src: local('Open Sans Italic'), local('OpenSans-Italic'),
              url('/fonts/open-sans-v17-latin-italic.woff2') format('woff2'), /* Chrome 26+, Opera 23+, Firefox 39+ */
              url('/fonts/open-sans-v17-latin-italic.woff') format('woff'); /* Chrome 6+, Firefox 3.6+, IE 9+, Safari 5.1+ */
        }
        
        /* open-sans-600 - latin */
        @font-face {
          font-family: 'Open Sans';
          font-style: normal;
          font-weight: 600;
          src: local('Open Sans SemiBold'), local('OpenSans-SemiBold'),
              url('/fonts/open-sans-v17-latin-600.woff2') format('woff2'), /* Chrome 26+, Opera 23+, Firefox 39+ */
              url('/fonts/open-sans-v17-latin-600.woff') format('woff'); /* Chrome 6+, Firefox 3.6+, IE 9+, Safari 5.1+ */
        }
        
        /* open-sans-700 - latin */
        @font-face {
          font-family: 'Open Sans';
          font-style: normal;
          font-weight: 700;
          src: local('Open Sans Bold'), local('OpenSans-Bold'),
              url('/fonts/open-sans-v17-latin-700.woff2') format('woff2'), /* Chrome 26+, Opera 23+, Firefox 39+ */
              url('/fonts/open-sans-v17-latin-700.woff') format('woff'); /* Chrome 6+, Firefox 3.6+, IE 9+, Safari 5.1+ */
        }
        
        /* open-sans-600italic - latin */
        @font-face {
          font-family: 'Open Sans';
          font-style: italic;
          font-weight: 600;
          src: local('Open Sans SemiBold Italic'), local('OpenSans-SemiBoldItalic'),
              url('/fonts/open-sans-v17-latin-600italic.woff2') format('woff2'), /* Chrome 26+, Opera 23+, Firefox 39+ */
              url('/fonts/open-sans-v17-latin-600italic.woff') format('woff'); /* Chrome 6+, Firefox 3.6+, IE 9+, Safari 5.1+ */
        }
        
        /* open-sans-700italic - latin */
        @font-face {
          font-family: 'Open Sans';
          font-style: italic;
          font-weight: 700;
          src: local('Open Sans Bold Italic'), local('OpenSans-BoldItalic'),
              url('/fonts/open-sans-v17-latin-700italic.woff2') format('woff2'), /* Chrome 26+, Opera 23+, Firefox 39+ */
              url('/fonts/open-sans-v17-latin-700italic.woff') format('woff'); /* Chrome 6+, Firefox 3.6+, IE 9+, Safari 5.1+ */
        }
        
        /* open-sans-800 - latin */
        @font-face {
          font-family: 'Open Sans';
          font-style: normal;
          font-weight: 800;
          src: local('Open Sans ExtraBold'), local('OpenSans-ExtraBold'),
              url('/fonts/open-sans-v17-latin-800.woff2') format('woff2'), /* Chrome 26+, Opera 23+, Firefox 39+ */
              url('/fonts/open-sans-v17-latin-800.woff') format('woff'); /* Chrome 6+, Firefox 3.6+, IE 9+, Safari 5.1+ */
        }
        
        /* open-sans-800italic - latin */
        @font-face {
          font-family: 'Open Sans';
          font-style: italic;
          font-weight: 800;
          src: local('Open Sans ExtraBold Italic'), local('OpenSans-ExtraBoldItalic'),
              url('/fonts/open-sans-v17-latin-800italic.woff2') format('woff2'), /* Chrome 26+, Opera 23+, Firefox 39+ */
              url('/fonts/open-sans-v17-latin-800italic.woff') format('woff'); /* Chrome 6+, Firefox 3.6+, IE 9+, Safari 5.1+ */
        }
        
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

        .message-meta {
          display: inline;
          marginLeft: 0.5rem;  
        }

        @media only screen and (min-width: 35rem) {
          .message-meta {
            display: block;
            position: absolute;
            top: 0;
            left: 100%;
          }
        }

        .stream-item-li {
          position: relative;
        }
        .stream-item {
          display: block;
          width: 100%;
          text-decoration: none;
          border-bottom: 1px solid lightgray;
          padding: 1rem 0;
        }
        .stream-item-name {
          display: block;
          float: left;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        .stream-item-date {
          float: right;
          font-size: 80%;
          color: lightgray;
        }
        .stream-item-last-message {
          clear: both;
          display: block;
          font-size: 90%;
          color: darkgray;
        }
        .stream-item-remove {
          position: absolute;
          bottom: 0;
          right: 0;
          display: none;
          color: lightgray;
          padding: 0.5rem;
          font-size: 80%;
          text-decoration: none;
        }
        .stream-item-li:hover .stream-item-remove {
          display: block;
        }
        
        h1 {
          position: relative;
        }
        .space-permalink {
          position: absolute;
          top: 0;
          left: 100%;
        }
        .message-permalink, .space-permalink {
          color: lightgray;
          text-decoration: none;
          font-weight: normal;
        }
        .message-permalink {
          font-size: 0.8rem;
          margin-left: 0.25rem;
          visibility: hidden;
        }
        .message:hover .message-permalink {
          visibility: visible;
        }
      `}
    </style>
    {children}
  </div>
)
