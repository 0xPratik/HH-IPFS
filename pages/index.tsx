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
  Button,
  Image as ChakraImage,
  Spinner,
} from "@chakra-ui/react";
import { VisuallyHidden, VisuallyHiddenInput } from "@chakra-ui/react";
import {
  createQR,
  encodeURL,
  findReference,
  FindReferenceError,
  validateTransfer,
  ValidateTransferError,
} from "@solana/pay";
import { useConfig } from "../contexts";
import { useEffect, useMemo, useRef, useState } from "react";
// import * as anchor from "@project-serum/anchor";
import { Transaction } from "@solana/web3.js";
import { Keypair, Connection } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import * as anchor from "@project-serum/anchor";
import { Web3Storage } from "web3.storage";
const Home: NextPage = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [show, setShow] = useState<boolean>(false);
  const [sig, setSig] = useState<string>("");
  const toast = useToast();
  const videoRef = useRef(null);
  const photoRef = useRef(null);
  const [metadataURL, setMetadataURL] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [textmessage, setTextMessage] = useState<string>(
    "Uploading files to IPFS"
  );

  const getVideo = () => {
    if (typeof window !== "undefined") {
      navigator.mediaDevices
        .getUserMedia({
          video: { width: window.screen.width, height: window.screen.height },
        })
        .then((stream) => {
          let video: any = videoRef.current;
          if (video !== null) {
            video.srcObject = stream;
            video.play();
          }
        })
        .catch((err) => {
          console.log("VIDEO ERROR", err);
        });
    }
  };

  useEffect(() => {
    getVideo();
  }, [videoRef]);

  function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(",")[0].indexOf("base64") >= 0)
      byteString = atob(dataURI.split(",")[1]);
    else byteString = unescape(dataURI.split(",")[1]);
    // separate out the mime component
    var mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ia], { type: mimeString });
  }

  async function dataUrlToFile(
    dataUrl: string,
    fileName: string
  ): Promise<File> {
    const res: Response = await fetch(dataUrl);
    const blob: Blob = await res.blob();
    return new File([blob], fileName, { type: "image/png" });
  }

  const getUrl = (cid: string, fileName: string) => {
    return `https://${cid}.ipfs.dweb.link/${fileName}`;
  };

  const clickPhoto = async () => {
    setLoading(true);
    let width = 700;
    let height = width / (16 / 9);

    let video = videoRef.current;
    let photo = photoRef.current;
    photo.width = width;
    photo.height = height;
    let ctx = photo.getContext("2d");
    console.log(video);
    if (ctx !== null) {
      ctx.drawImage(video, 0, 0, photo.width, photo.height);
    }
    // console.log("RUNN", photo.toDataURL("image/png"));
    // setImageDataURL(photo.toDataURL("image/png"));
    const img = photo.toDataURL("image/png");
    const file = await dataUrlToFile(img, "photo.png");

    const client = new Web3Storage({
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDg0QTA4MjA3YjRkQWU2MjFGN2YwZEZmMkM5QzM2RkQ1NTlGMjg0REUiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2NTIyNzEyNDcxODYsIm5hbWUiOiJQcmF0aWsifQ.Ucs3mGMnN3bMzUHqCqHsM8FaHBL4hY27rLB-nEKWG8g",
    });

    setTextMessage("Uploading your Photo to IPFS");
    const cid = await client.put([file]);

    console.log("Uploaded to IPFS", cid);

    const imageURL = getUrl(cid, "photo.png");

    setTextMessage("Uploaded your Photo to IPFS");

    const metadata = {
      name: "Hacker House Bengaluru",
      symbol: "BLR",
      description: "I have been to the Hacker house Bengaluru",
      seller_fee_basis_points: 750,
      image: `${imageURL}?ext=png`,
      external_url: "https://lu.ma/bengaluru-hacker-house?pk=g-dVB3i2wX6P8v6v9",
      attributes: [
        {
          trait_type: "Organizer",
          value: "Solana",
        },
        {
          trait_type: "Organized for",
          value: "Buildoors",
        },
        {
          trait_type: "Country",
          value: "India",
        },
        {
          trait_type: "City",
          value: "Bengaluru",
        },
      ],
      collection: {
        name: "Bengaluru",
        family: "Hacker house",
      },
      properties: {
        files: [
          {
            uri: `${imageURL}?ext=png`,
            type: "image/png",
          },
        ],
        category: "image",
        creators: [
          {
            address: "7zL7HVn85F5yFT6XM3BsJcQF7PBcNE7R2BT5GyfunpKe",
            share: 100,
          },
        ],
      },
    };

    const blob = new Blob([JSON.stringify(metadata)], {
      type: "application/json",
    });

    const metadataFile = new File([blob], "metadata.json");
    setTextMessage("Uploading Metadata to IPFS");
    const meta_cid = await client.put([metadataFile]);
    console.log("Uploaded MEtadata to IPFS", meta_cid);
    setTextMessage("Uploaded Metadata to IPFS");

    const metadataURL = getUrl(meta_cid, "metadata.json");

    console.log("Metadata URL", metadataURL);
    setMetadataURL(metadataURL);
    setLoading(false);
  };

  async function getTransaction() {
    if (!wallet.publicKey) {
      return;
    }

    const body = {
      account: wallet.publicKey.toString(),
    };

    const response = await fetch(`/api/nft?${searchParams.toString()}`, {
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
    console.log(transaction.instructions);
    console.log("feepayer", transaction.feePayer?.toString());

    if (wallet.signTransaction) {
      let signed = wallet.signTransaction(transaction);
      const val = transaction.signatures;

      val.forEach((v) => {
        console.log(v.publicKey.toString());
      });

      try {
        const endpoint = "https://api.devnet.solana.com";
        const connection = new Connection(endpoint);

        const data = await connection.sendRawTransaction(
          (await signed).serialize()
        );
        console.log("data", data);
      } catch (error) {
        console.log("TX", error);
      }
    }
  }

  useEffect(() => {
    if (show === true) {
      toast({
        title: "Transaction found",
        description: sig,
        status: "success",
        duration: 9000,
        isClosable: true,
      });
    }
  }, [show]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Check if there is any transaction for the reference
        const signatureInfo: any = await findReference(connection, reference, {
          finality: "confirmed",
        });
        setSig(signatureInfo.signature);
        // Validate that the transaction has the expected recipient, amount and SPL token
        if (
          signatureInfo.signature !== null &&
          signatureInfo.confirmationStatus == "finalized"
        ) {
          setShow(true);
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
  searchParams.append("metadata", metadataURL);

  const { baseUrl } = useConfig();

  const link = `${baseUrl}/api/nft?${searchParams.toString()}`;

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

  return (
    <Box
      w="100%"
      h="100vh"
      bg="teal"
      color="white"
      fontWeight="bold"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      {/* <div ref={qrRef} style={{ background: "white" }} /> */}

      {metadataURL === "" && loading === false && <video ref={videoRef} />}
      {metadataURL !== "" && (
        <div ref={qrRef} style={{ background: "white" }} />
      )}
      {loading && (
        <>
          <Spinner size="xl" />
          <Text>{textmessage}</Text>
        </>
      )}

      {!loading && (
        <Button
          variant="solid"
          colorScheme="orange"
          size="lg"
          mt={"2"}
          borderRadius={"full"}
          onClick={clickPhoto}
        >
          {" "}
        </Button>
      )}
      {/* <WalletMultiButton />
      <Button colorScheme="red" onClick={getTransaction} isLoading={loading}>
        Do Tx
      </Button> */}
      <VisuallyHidden>
        <canvas ref={photoRef}></canvas>
      </VisuallyHidden>
    </Box>
  );
};

export default Home;
