import { Wallet } from "@project-serum/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import nextConnect from "next-connect";
import { MakeTransactionInputData, MakeTransactionOutputData } from "./index";
import type { NextApiRequest, NextApiResponse } from "next";

type MakeTransactionGetResponse = {
  label: string;
  icon: string;
};

const handler = nextConnect()
  .get((req: NextApiRequest, res: NextApiResponse) => {
    res.status(200).json({
      label: "Send 1 SOL",
      icon: "https://s2.svgbox.net/illlustrations.svg?ic=coffee",
    });
  })
  .post(async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      console.log("INSIDE SEND");
      const { reference } = req.query;

      console.log("REFERECE is --", reference);
      if (!reference) {
        res.status(400).json({ error: "No reference provided" });
        return;
      }
      const { account } = req.body as MakeTransactionInputData;
      if (!account) {
        res.status(40).json({ error: "No account provided" });
        return;
      }
      const user = new PublicKey(account);

      const endpoint = "https://metaplex.devnet.rpcpool.com/";
      const connection = new anchor.web3.Connection(endpoint);
      const { blockhash } = await connection.getLatestBlockhash("finalized");

      const transaction = new Transaction({
        recentBlockhash: blockhash,
        // The buyer pays the transaction fee
        feePayer: user,
      });

      const my = new PublicKey("CsEYyFxVtXxezfLTUWYwpj4ia5oCAsBKznJBWiNKLyxK");

      const t = SystemProgram.transfer({
        fromPubkey: user,
        toPubkey: my,
        lamports: 1 * anchor.web3.LAMPORTS_PER_SOL,
      });

      t.keys.push({
        pubkey: new PublicKey(reference),
        isSigner: false,
        isWritable: false,
      });

      transaction.add(t);

      const serializedTransaction = transaction.serialize({
        // We will need the buyer to sign this transaction after it's returned to them
        requireAllSignatures: false,
      });
      const base64 = serializedTransaction.toString("base64");

      res.status(200).json({
        transaction: base64,
        message: "Thanks for Minting NFT",
      });
    } catch (error) {
      console.log("SEND SERVER ERROR PRATIK", error);
      res.status(500).json({ error: "error creating transaction" });
    }
  });
