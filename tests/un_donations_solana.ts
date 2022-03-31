import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { UnDonationsSolana } from "../target/types/un_donations_solana";
import {strict as assert} from 'assert';
import {Buffer} from 'buffer';

describe("un_donations_solana", async () => {
  // Configure the client to use the local cluster.
  const provider = anchor.Provider.local();

  anchor.setProvider(provider);

  const program = anchor.workspace.UnDonationsSolana as Program<UnDonationsSolana>;

  const walletAccount = anchor.web3.Keypair.generate();

  // create pda for storing donations list
  const [storagePda, storageBump] =  await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("donationStorage")],
    program.programId
  );

  it("initialize", async () => {

    // initialize accounts
    await program.rpc.initialize(
      storageBump,
      {
        accounts: {
          donationWallet: walletAccount.publicKey,
          donationStorage: storagePda,
          creator: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [walletAccount]
    });

    console.log("Initialization passed");
  });

  it("make donation test", async () => {
    const number = new anchor.BN(1234);

    // try to make donation
    const tx = await program.rpc.makeDonation(
      number,
      {
        accounts: {
          donationWallet: walletAccount.publicKey,
          donationStorage: storagePda,
          user: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
      }
    );
    console.log("Donation passed");

    const storageAccount = await program.account.donationStorage.fetch(storagePda);

    assert.ok(storageAccount.donations[0].amount.eq(number));
  });

  it("withdrawal test with correct account", async () => {
    const lamports = new anchor.BN(1000);

    let tx = await program.rpc.withdrawDonations(
        lamports,
        {
          accounts : {
            donationWallet: walletAccount.publicKey,
            authority: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          }
        }
    );
  });

  it("withdrawal test with wrong account", async () => {
    const lamports = new anchor.BN(1000);
    const wrongAccount = anchor.web3.Keypair.generate();

    let error;

    try {
      await program.rpc.withdrawDonations(
        lamports,
        {
          accounts : {
            donationWallet: walletAccount.publicKey,
            authority: wrongAccount.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          }
        }
      );
    } catch (err: unknown) {
        if (err instanceof Error) {
          error = err;
        }
    } finally {
      assert.equal(error.message, "Signature verification failed");
    }

    const donationWallet = await program.account.donationWallet.fetch(walletAccount.publicKey);
    const balance = new anchor.BN(234);
  });
});
