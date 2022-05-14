import { Wallet } from "@project-serum/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import type { NextApiRequest, NextApiResponse } from "next";
import IDL from "../../idl.json";
import nextConnect from "next-connect";
import * as anchor from "@project-serum/anchor";
import {
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  createInitializeMintInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from "@solana/spl-token";
import {
  createCreateMetadataAccountV2Instruction,
  DataV2,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  CreateMetadataAccountV2InstructionArgs,
  createCreateMasterEditionV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";

export type MakeTransactionInputData = {
  account: string;
};

export type MakeTransactionOutputData = {
  transaction: string;
  message: string;
};

type MakeTransactionGetResponse = {
  label: string;
  icon: string;
};

const handler = nextConnect()
  .get(
    (req: NextApiRequest, res: NextApiResponse<MakeTransactionGetResponse>) => {
      res.status(200).json({
        label: "Mint NFT",
        icon: "https://s2.svgbox.net/illlustrations.svg?ic=coffee",
      });
    }
  )
  .post(async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const { reference, metadata } = req.query;

      console.log("REFERENCE", reference);

      console.log("METADATA", metadata);

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

      const dummy_key_pair = new anchor.web3.Keypair();

      const dummyWallet = new Wallet(dummy_key_pair);

      console.log("DUMMY WALLET", dummyWallet.publicKey.toString());

      const TOKEN_PROGRAM_ID = new PublicKey(
        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
      );

      const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
        "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
      );

      const mintKey = anchor.web3.Keypair.generate();

      console.log("Mint Key", mintKey.publicKey.toString());

      const lamports = await connection.getMinimumBalanceForRentExemption(
        MINT_SIZE
      );

      let ata = await getAssociatedTokenAddress(
        mintKey.publicKey, // mint
        user // owner
      );

      transaction.add(
        anchor.web3.SystemProgram.createAccount({
          fromPubkey: user,
          newAccountPubkey: mintKey.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mintKey.publicKey, // mint pubkey
          0, // decimals
          user, // mint authority
          user // freeze authority (you can use `null` to disable it. when you disable it, you can't turn it on again)
        ),
        createAssociatedTokenAccountInstruction(
          user,
          ata,
          user,
          mintKey.publicKey
        ),
        createMintToInstruction(
          mintKey.publicKey, // mint
          ata,
          user,
          1
        )
      );

      const [metadatakey] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mintKey.publicKey.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );
      console.log("METADATA --", metadatakey.toString());

      const [masterKey] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mintKey.publicKey.toBuffer(),
          Buffer.from("edition"),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      console.log("MASTER --", masterKey.toString());

      const stringMetadata: string = metadata.toString();

      const data: DataV2 = {
        name: "Hacker House",
        symbol: "HH",
        uri: stringMetadata,
        sellerFeeBasisPoints: 1000,
        creators: [
          {
            address: new anchor.web3.PublicKey(
              "9iSD3wkC1aq3FcwgjJfEua9FkkZJWv7Cuxs6sKjc3VnR"
            ),
            verified: false,
            share: 100,
          },
          {
            address: user,
            verified: false,
            share: 0,
          },
        ],
        collection: null,
        uses: null,
      };

      const args = {
        data,
        isMutable: false,
      };

      const createMetadataV2 = createCreateMetadataAccountV2Instruction(
        {
          metadata: metadatakey,
          mint: mintKey.publicKey,
          mintAuthority: user,
          payer: user,
          updateAuthority: user,
        },
        {
          createMetadataAccountArgsV2: args,
        }
      );

      transaction.add(createMetadataV2);
      const createMasterEditionV3 = createCreateMasterEditionV3Instruction(
        {
          edition: masterKey,
          mint: mintKey.publicKey,
          updateAuthority: user,
          mintAuthority: user,
          payer: user,
          metadata: metadatakey,
        },
        {
          createMasterEditionArgs: {
            maxSupply: new anchor.BN(1),
          },
        }
      );

      createMasterEditionV3.keys.push({
        pubkey: new PublicKey(reference),
        isSigner: false,
        isWritable: false,
      });
      transaction.add(createMasterEditionV3);

      transaction.partialSign(mintKey);

      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
      });
      const base64 = serializedTransaction.toString("base64");

      res.status(200).json({
        transaction: base64,
        message: "Thanks for Minting NFT",
      });
    } catch (error) {
      console.log("Minting SERVER ERROR PRATIK", error);
      res.status(500).json({ error: "error creating transaction" });
    }
  });

export default handler;
