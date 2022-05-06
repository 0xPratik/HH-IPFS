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
      const { reference } = req.query;
      // const { reference, mintKey } = req.query;
      console.log("QUERY", req.query);
      console.log("REFERENCE", reference);
      // console.log("MINTKEY", mintKey);
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

      const candyMachineAddress =
        "8n4ig2jTF2TedYB3FQvTmpDBBNzRonSXLSpgYnPpjauX";
      const cm = new PublicKey(candyMachineAddress);
      const dummy_key_pair = new anchor.web3.Keypair();

      const dummyWallet = new Wallet(dummy_key_pair);

      console.log("DUMMY WALLET", dummyWallet.publicKey.toString());

      // const cndy = await getCandyMachineState(dummyWallet, cm, connection);

      // const tx: any = await mintOneTokenQR(cndy, user);
      // console.log("TX 1", tx[0]);
      // console.log("TX 2", tx[1]);
      // const ix = tx[0];

      // ix[0].keys.push({
      //   pubkey: new anchor.web3.PublicKey(reference),
      //   isSigner: false,
      //   isWritable: false,
      // });
      // console.log("IX", ix);
      // console.log(transaction);
      // for (let i = 0; i < ix.length; i++) {
      //   transaction.add(ix[i]);
      // }

      // const my = new PublicKey("CsEYyFxVtXxezfLTUWYwpj4ia5oCAsBKznJBWiNKLyxK");
      // const t = SystemProgram.transfer({
      //   fromPubkey: user,
      //   toPubkey: my,
      //   lamports: 1 * anchor.web3.LAMPORTS_PER_SOL,
      // });
      // transaction.add(t);

      const TOKEN_PROGRAM_ID = new PublicKey(
        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
      );
      const opts = {
        preflightCommitment: "processed" as anchor.web3.ConfirmOptions,
      };

      const getProvider = () => {
        /* create the provider and return it to the caller */
        /* network set to local network for now */
        const network = "https://metaplex.devnet.rpcpool.com/";
        const connection = new anchor.web3.Connection(
          network,
          opts.preflightCommitment
        );

        const provider = new anchor.Provider(
          connection,
          dummyWallet,
          opts.preflightCommitment
        );
        console.log("Provider Set");
        return provider;
      };

      const provider = getProvider();
      const idl = IDL as anchor.Idl;
      const programId = new anchor.web3.PublicKey(
        "EoBG2VasooF76AX25K6Bsm8BMnimMKQi6JcFj6CMCSA1"
      );
      const program = new anchor.Program(idl, programId, provider);

      // const adminKey = new anchor.web3.PublicKey(
      //   "BZ45rj3gVx8pgqVmtYSCWwu8n6tEyCT4aHSyGkpgRCr8"
      // );
      const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
        "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
      );

      const mintKey = anchor.web3.Keypair.generate();

      console.log("Mint Key", mintKey.publicKey.toString());
      console.log("WORKING here");
      const lamports =
        await program.provider.connection.getMinimumBalanceForRentExemption(
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
      console.log("Partial Tx", transaction);

      const [metadatakey] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mintKey.publicKey.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );
      console.log("METDATA", metadatakey.toString());

      const [masterKey] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mintKey.publicKey.toBuffer(),
          Buffer.from("edition"),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      console.log("MASTER", masterKey.toString());

      const data: DataV2 = {
        name: "Pratik",
        symbol: "PAT",
        uri: "https://arweave.net/sCuT4ASiUgq7JxgU_3aoq0xJLpwH2Z1z2R2_xwPM8uc",
        sellerFeeBasisPoints: 1000,
        creators: [
          {
            address: new anchor.web3.PublicKey(
              "9iSD3wkC1aq3FcwgjJfEua9FkkZJWv7Cuxs6sKjc3VnR"
            ),
            verified: false,
            share: 100,
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

      // const treasury = new anchor.web3.PublicKey(
      //   "9iSD3wkC1aq3FcwgjJfEua9FkkZJWv7Cuxs6sKjc3VnR"
      // );

      // const ix = await program.instruction.mintSolNft(
      //   new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL),
      //   "Pratik",
      //   "PAT",
      //   "https://bafkreiftbyb4vht53hjxsypodrwd5qhjxwk33iezkxtid6wxggyj26dcji.ipfs.nftstorage.link/",
      //   10000,
      //   true,
      //   {
      //     accounts: {
      //       admin: admin,
      //       authority: user,
      //       masterEdition: masterKey,
      //       metadata: metadatakey,
      //       mint: mintKey.publicKey,
      //       mplProgram: TOKEN_METADATA_PROGRAM_ID,
      //       rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      //       systemProgram: anchor.web3.SystemProgram.programId,
      //       tokenProgram: TOKEN_PROGRAM_ID,
      //       treasuryAccount: treasury,
      //       recipient: ata,
      //     },
      //   }
      // );

      // const [vote, _votebump] = await anchor.web3.PublicKey.findProgramAddress(
      //   [Buffer.from("vote_account")],
      //   program.programId
      // );

      // const ix = await program.instruction.voteSuperMan({
      //   accounts: {
      //     voteAccount: vote,
      //   },
      // });

      // ix.keys.forEach((key: any) =>
      //   console.log(key.pubkey.toString(), key.isSigner)
      // );

      // transaction.partialSign(mintKey);

      // Serialize the transaction and convert to base64 to return it
      const serializedTransaction = transaction.serialize({
        // We will need the buyer to sign this transaction after it's returned to them
        requireAllSignatures: false,
      });
      const base64 = serializedTransaction.toString("base64");

      console.log(base64);

      res.status(200).json({
        transaction: base64,
        message: "Thanks for Minting NFT",
      });
    } catch (error) {
      console.log("MAIN SERVER ERROR PRATIK", error);
      res.status(500).json({ error: "error creating transaction" });
    }
  });

export default handler;
