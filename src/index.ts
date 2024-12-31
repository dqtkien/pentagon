import 'dotenv/config';
import { ethers } from 'ethers';
import { Orand } from '@helper';
import { INIT_EPOCH } from '@data';

const privateKey = process.env.WALLET_PRIVATE_KEY;
const rpcUrl = process.env.RPC_URL;
const orandProviderAddress = process.env.ORAND_PROVIDER_ADDRESS;

const CONSUMER_ADDRESS = '0x540AF102792020f7f300a3AF4fF52af1B71BfF69';

if (!privateKey || !rpcUrl || !orandProviderAddress) {
  throw new Error('Invalid initial parameters');
}

const wallet = new ethers.Wallet(privateKey);

const orandInstance = await Orand.fromConfig(rpcUrl, orandProviderAddress, CONSUMER_ADDRESS);

console.log('Result', await orandInstance.publish(INIT_EPOCH, wallet));
