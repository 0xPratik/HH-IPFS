import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import {
  Box,
  Heading,
  Text,
  Container,
  Flex,
  Center,
  useToast,
} from "@chakra-ui/react";
import {
  createQR,
  encodeURL,
  findReference,
  FindReferenceError,
  validateTransfer,
  ValidateTransferError,
} from "@solana/pay";
import { useConfig } from "../contexts";
import { useEffect, useMemo, useRef } from "react";
// import * as anchor from "@project-serum/anchor";
import { Transaction } from "@solana/web3.js";
import { Keypair, Connection } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const Home: NextPage = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const toast = useToast();
  async function getTransaction() {
    if (!wallet.publicKey) {
      return;
    }

    const body = {
      account: wallet.publicKey.toString(),
    };

    const response = await fetch(`/api?${searchParams.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = await response.json();
    console.log("MAIN JSON", json);

    if (response.status !== 200) {
      console.error(json);
      return;
    }

    // Deserialize the transaction from the response
    const transaction = Transaction.from(
      Buffer.from(json.transaction, "base64")
    );
    console.log(transaction);
    const val = transaction.signatures;
    val.forEach((v) => {
      console.log(v.publicKey.toString());
    });
    try {
      const endpoint = "https://api.devnet.solana.com";
      const connection = new Connection(endpoint);
      const data = await wallet.sendTransaction(transaction, connection);
      console.log(data);
    } catch (error) {
      console.log("TX", error);
    }
  }

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Check if there is any transaction for the reference
        const signatureInfo: any = await findReference(connection, reference, {
          finality: "confirmed",
        });
        console.log(signatureInfo.signature);
        // Validate that the transaction has the expected recipient, amount and SPL token
        if (
          signatureInfo.signature !== null &&
          signatureInfo.confirmationStatus == "finalized"
        ) {
          toast({
            title: "Transaction found",
            description: signatureInfo.signature,
            status: "success",
            duration: 9000,
            isClosable: true,
          });
          return;
        }
      } catch (e) {
        if (e instanceof FindReferenceError) {
          // No transaction found yet, ignore this error
          return;
        }
        if (e instanceof ValidateTransferError) {
          // Transaction is invalid
          console.error("Transaction is invalid", e);
          return;
        }
        console.error("Unknown error", e);
      }
    }, 500);
    return () => {
      clearInterval(interval);
    };
  }, []);

  // useEffect(() => {
  //   getTransaction();
  // }, [wallet.publicKey]);

  const reference = useMemo(() => Keypair.generate().publicKey, []);
  const searchParams = new URLSearchParams();
  searchParams.append("reference", reference.toString());

  const { baseUrl } = useConfig();

  const link = `${baseUrl}/api?${searchParams.toString()}`;

  console.log("LINK", link);
  const label = "Pratik";
  const message = "Hi From Pratik Saria";

  const url = encodeURL({ link: new URL(link), label, message });
  console.log("Encoding this URL", url);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const qr = createQR(url, 512, "transparent");
    if (qrRef.current) {
      qrRef.current.innerHTML = "";
      qr.append(qrRef.current);
    }
  }, [url]);

  return (
    <Center
      w="100vw"
      h="100vh"
      flexDir={"column"}
      bg="blueviolet"
      color="white"
    >
      <div ref={qrRef} style={{ background: "white" }} />
      <h1>There is a Login Button</h1>
      <WalletMultiButton />
    </Center>
  );
};

export default Home;
