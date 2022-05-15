import "../styles/globals.css";
import type { AppProps } from "next/app";
import { AppContext, default as NextApp } from "next/app";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  GlowWalletAdapter,
  LedgerWalletAdapter,
  PhantomWalletAdapter,
  SlopeWalletAdapter,
  SolflareWalletAdapter,
  SolletExtensionWalletAdapter,
  SolletWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import {
  WalletModalProvider,
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { ChakraProvider } from "@chakra-ui/react";
import { ConfigProvider } from "../contexts";
import { useMemo } from "react";
require("@solana/wallet-adapter-react-ui/styles.css");

interface MyAppProps extends AppProps {
  host: string;
}

function MyApp({ Component, pageProps, host }: MyAppProps) {
  const baseUrl = `https://${host}`;
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new GlowWalletAdapter(),
      new SlopeWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new TorusWalletAdapter(),
    ],
    [network]
  );
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets}>
        <WalletModalProvider>
          <ConfigProvider baseUrl={baseUrl}>
            <ChakraProvider>
              <Component {...pageProps} />
            </ChakraProvider>
          </ConfigProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
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
