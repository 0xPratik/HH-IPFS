import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import { Box, Heading, Text, Container, Flex, Center } from "@chakra-ui/react";
import { createQR, encodeURL } from "@solana/pay";
import { useConfig } from "../contexts";
import { useEffect, useRef } from "react";
// import * as anchor from "@project-serum/anchor";
import { Transaction } from "@solana/web3.js";
import { Keypair, Connection } from "@solana/web3.js";

const Home: NextPage = () => {
  async function getTransaction() {
    const test = new Keypair().publicKey;

    const body = {
      account: test.toString(),
    };

    const response = await fetch(`/api`, {
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
      console.log("SIGNATORIES", v.publicKey.toString());
    });
    // transaction.partialSign(mintKey);
    try {
      const endpoint = "https://metaplex.devnet.rpcpool.com/";
      const connection = new Connection(endpoint);
    } catch (error) {
      console.log("TX", error);
    }
  }

  const { baseUrl } = useConfig();

  console.log("BASE URL", baseUrl);

  const link = `${baseUrl}/api?`;
  console.log(link);
  const label = "Pratik";
  const message = "Hi From Pratik Saria";

  const url = encodeURL({ link: new URL(link), label, message });
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const qr = createQR(url, 512, "transparent");
    if (qrRef.current) {
      qrRef.current.innerHTML = "";
      qr.append(qrRef.current);
    }
  }, [url]);

  useEffect(() => {
    getTransaction();
  }, []);
  return (
    <Center w="100vw" h="100vh" bg="blueviolet" color="white">
      <div ref={qrRef} style={{ background: "white" }} />
    </Center>
  );
};

export default Home;
