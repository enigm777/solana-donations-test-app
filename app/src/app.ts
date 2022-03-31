import { readFileSync } from "fs"
import * as anchor from '@project-serum/anchor'
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
  clusterApiUrl
} from "@solana/web3.js"
import BN from "bn.js"
import type { Program } from "@project-serum/anchor"
import Wallet from "@project-serum/sol-wallet-adapter"


const opts = {
	preflightCommitment: "recent",
	commitment: "recent"
}

export class App {
  static counterSeed = "counter"
  static settingsSeed = "settings"

  adminKeypair: Keypair
  donationWallet: Keypair
  donationStorage: PublicKey
  connection: Connection
  program: Program
  provider: anchor.Provider
  solletWallet: Wallet

  constructor() {
    // placed in deploy folder idl and admin key for convenience purposes only
    const data = JSON.parse(require("fs").readFileSync("./deploy/admin.json", "utf-8"));
    const idl = JSON.parse(
        require("fs").readFileSync("./deploy/un_donations_solana.json", "utf8")
    );
    this.adminKeypair = Keypair.fromSecretKey(Buffer.from(data))
    this.donationWallet = anchor.web3.Keypair.generate();
    this.connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    console.log("Connected to " + clusterApiUrl("devnet"));

    let providerUrl = 'https://www.sollet.io';
    this.solletWallet = new Wallet(providerUrl, clusterApiUrl('devnet'));
    this.solletWallet.on('connect', publicKey => console.log('Connected to ' + publicKey.toBase58()));
    this.solletWallet.on('disconnect', () => console.log('Disconnected'));

    const programId = new PublicKey("99YgW3iUUTZYsZWyaneNZreF3x86NqByKzcE6vAtwMkm");

    this.provider = new anchor.Provider(this.connection, this.solletWallet, anchor.Provider.defaultOptions());

    this.program = new anchor.Program(idl, programId, this.provider);
  }


  async init() {

    // pda account to store donations information
    const [storagePda, storageBump] =  await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("donationStorage")],
        this.program.programId
    );

    this.donationStorage = storagePda;
    
    await this.program.rpc.initialize(
        storageBump,
        {
            accounts: {
                donationWallet: this.donationWallet.publicKey,
                donationStorage: storagePda,
                // authorize with our admin key, stored in file
                creator: this.adminKeypair.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId
            },
            signers: [this.donationWallet]
        }
    );

    console.log("admin", this.adminKeypair.publicKey.toBase58())
    console.log("donationWallet", this.donationWallet.publicKey.toBase58())
    console.log("donationStorage", this.donationStorage.toBase58())
  }

  async connectWallet() {
    this.solletWallet.connect();
    console.log("wallet connected");
  }

  async makeDonation(amount) {
      await this.program.rpc.makeDonation(
        amount,
        {   accounts: {
                  donationWallet: this.donationWallet.publicKey,
                  donationStorage: this.donationStorage,
                  user: this.program.provider.wallet.publicKey,
                  systemProgram: anchor.web3.SystemProgram.programId
            }
        }
    );
  }

  async withdrawDonations() {
      await this.program.rpc.withdrawDonations(
          {
              accounts: {
                  donationWallet: this.donationWallet.publicKey,
                // if user is not admin (key is not equal to key from admin.json), he will not be able to withdraw
                  authority: this.program.provider.wallet.publicKey,
                  systemProgram: anchor.web3.SystemProgram.programId
              }
          }
      );
  }

  async getDonationsByUser(userId) {
      const donationStorageAccount = await this.program.account.donationStorage.fetch(this.donationStorage);
      const userPubkey = new PublicKey(userId);
      let donations = [];
      donationStorageAccount.donations.forEach(donation => {
          if (donation.userId == userPubkey) {
              donations.push(donation);
          }
      });
      return donations;
  }

  async getAllDonations() {
    const donationStorageAccount = await this.program.account.donationStorage.fetch(this.donationStorage);
    let donations = [];
    donationStorageAccount.donations.forEach(donation => {
        donations.push(donation);
    });
    return donations;
  }
}