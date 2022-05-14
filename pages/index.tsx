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

  const getVideo = () => {
    if (typeof window !== "undefined") {
      navigator.mediaDevices
        .getUserMedia({
          video: { width: 1920, height: 1080 },
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
    return `${cid}.ipfs.dweb.link/${fileName}`;
  };

  const clickPhoto = async () => {
    setLoading(true);
    let width = 500;
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

    const cid = await client.put([file]);
    console.log("Uploaded to IPFS", cid);

    const imageURL = getUrl(cid, "photo.png");

    const metadata = {
      name: "Okay Bear #4438",
      symbol: "okay_bears",
      description:
        "Okay Bears is a culture shift. A clean collection of 10,000 diverse bears building a virtuous community that will transcend the internet into the real world.",
      seller_fee_basis_points: 750,
      image: `${imageURL}?ext=png`,
      external_url: "https://www.okaybears.com/",
      attributes: [
        {
          trait_type: "Background",
          value: "Blue",
        },
        {
          trait_type: "Fur",
          value: "Dark Brown",
        },
        {
          trait_type: "Mouth",
          value: "Okay",
        },
        {
          trait_type: "Eyes",
          value: "Interested",
        },
        {
          trait_type: "Hat",
          value: "Sticky Note",
        },
        {
          trait_type: "Clothes",
          value: "Sleeveless Tee",
        },
      ],
      collection: {
        name: "Okay Bears",
        family: "Okay Bears",
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
    const meta_cid = await client.put([metadataFile]);
    console.log("Uploaded MEtadata to IPFS", meta_cid);

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
    <Center w="100vw" h="100%" flexDir={"column"} bg="blueviolet" color="white">
      {/* <div ref={qrRef} style={{ background: "white" }} /> */}

      {metadataURL === "" && <video ref={videoRef} />}
      {metadataURL !== "" && (
        <div ref={qrRef} style={{ background: "white" }} />
      )}

      <Button variant="solid" colorScheme="blue" onClick={clickPhoto}>
        Click Photo
      </Button>
      <WalletMultiButton />
      <Button colorScheme="red" onClick={getTransaction} isLoading={loading}>
        Do Tx
      </Button>
      <canvas ref={photoRef}></canvas>
    </Center>
  );
};

export default Home;
