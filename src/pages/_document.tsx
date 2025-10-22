import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head />
        <body>
          <Main />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function(){
                  try {
                    ['blocknative','ethereum','solana','web3','wallet','onboard'].forEach(k => {
                      if (window[k]) { try { delete window[k]; } catch(e){} }
                    });
                  } catch(e){}
                  document.addEventListener('DOMContentLoaded', function(){ 
                    try {
                      ['blocknative','ethereum','solana','web3','wallet','onboard'].forEach(k => {
                        if (window[k]) { try { delete window[k]; } catch(e){} }
                      });
                    } catch(e){}
                  });
                })();
              `,
            }}
          />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
