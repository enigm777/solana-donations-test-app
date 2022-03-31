import "regenerator-runtime/runtime"
import {
  Connection,
  PublicKey,
  SystemProgram,
  clusterApiUrl,
  Keypair
} from "@solana/web3.js"
import Wallet from "@project-serum/sol-wallet-adapter"
import * as anchor from '@project-serum/anchor'
import { App } from "./app"

export async function init() {
    const app = new App()
    await app.connectWallet()
    await app.init()
    console.log("init func called")
}

