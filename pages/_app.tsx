import "../styles/globals.css";
import type { AppProps } from "next/app";
import { AppContext, default as NextApp } from "next/app";

import { ChakraProvider } from "@chakra-ui/react";
import { ConfigProvider } from "../contexts";

interface MyAppProps extends AppProps {
  host: string;
}

function MyApp({ Component, pageProps, host }: MyAppProps) {
  const baseUrl = `https://${host}`;
  return (
    <ConfigProvider baseUrl={baseUrl}>
      <ChakraProvider>
        <Component {...pageProps} />
      </ChakraProvider>
    </ConfigProvider>
  );
}

MyApp.getInitialProps = async (appContext: AppContext) => {
  const props = await NextApp.getInitialProps(appContext);
  const { req } = appContext.ctx;
  const host = req?.headers.host || "localhost:3000";

  return {
    ...props,
    host,
  };
};

export default MyApp;
