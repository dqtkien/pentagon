import { AbiOrandProviderV3, OrandProviderV3 } from '@orochi-network/contracts';
import { ContractRunner, ContractTransactionResponse, ethers } from 'ethers';

export type OrandEpoch = {
  epoch: number;
  alpha: string;
  gamma: string;
  c: string;
  s: string;
  y: string;
  witnessAddress: string;
  witnessGamma: string;
  witnessHash: string;
  inverseZ: string;
  signatureProof: string;
  createdDate: string;
};

export type VerifyEpochProofResult = {
  ecdsaProof: {
    signer: string;
    receiverAddress: string;
    receiverEpoch: bigint;
    ecvrfProofDigest: bigint;
  };
  currentEpochNumber: bigint;
  isEpochLinked: boolean;
  isValidDualProof: boolean;
  currentEpochResult: bigint;
  verifiedEpochResult: bigint;
};

export type OrandEpochProof = {
  // Skip pk since it existed on smart contract
  gamma: [string, string];
  c: string;
  s: string;
  alpha: string;
  uWitness: string;
  cGammaWitness: [string, string];
  sHashWitness: [string, string];
  zInv: string;
};

export type OrandProof = {
  ecdsaProof: string;
  ecvrfProof: OrandEpochProof;
};

function paddingZero(value: string): string {
  return value.length % 2 === 0 ? value : value.padStart(value.length + 1, '0');
}

function addHexPrefix(value: string): string {
  return /^0x/gi.test(value) ? paddingZero(value) : `0x${paddingZero(value)}`;
}

export class Orand {
  private static instance = new Map<string, Orand>();

  private orandProvider: OrandProviderV3;

  private consumerAddress: string;

  private constructor(orandProvider: OrandProviderV3, consumerAddress: string) {
    this.orandProvider = orandProvider;
    this.consumerAddress = consumerAddress;
  }

  public static async fromConfig(
    rpcUrl: string,
    orandProviderAddress: string,
    consumerAddress: string,
  ): Promise<Orand> {
    const key = `${rpcUrl}/${orandProviderAddress}/${consumerAddress}`;
    if (Orand.instance.has(key)) {
      return Orand.instance.get(key)!;
    }
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const orandProvider: OrandProviderV3 = new ethers.Contract(
      orandProviderAddress,
      AbiOrandProviderV3,
      provider,
    ) as any;
    const newInstance = new Orand(orandProvider, consumerAddress);
    Orand.instance.set(key, newInstance);
    return newInstance;
  }

  public static transformProof(proof: OrandEpoch): OrandProof {
    return {
      ecdsaProof: addHexPrefix(proof.signatureProof),
      ecvrfProof: {
        gamma: [addHexPrefix(proof.gamma.substring(0, 64)), addHexPrefix(proof.gamma.substring(64, 128))] as [
          string,
          string,
        ],
        c: addHexPrefix(proof.c),
        s: addHexPrefix(proof.s),
        alpha: addHexPrefix(proof.alpha),
        uWitness: addHexPrefix(proof.witnessAddress),
        cGammaWitness: [
          addHexPrefix(proof.witnessGamma.substring(0, 64)),
          addHexPrefix(proof.witnessGamma.substring(64, 128)),
        ] as [string, string],
        sHashWitness: [
          addHexPrefix(proof.witnessHash.substring(0, 64)),
          addHexPrefix(proof.witnessHash.substring(64, 128)),
        ] as [string, string],
        zInv: addHexPrefix(proof.inverseZ),
      },
    };
  }

  public async verifyEpoch(epochECVRFProof: OrandEpoch): Promise<VerifyEpochProofResult> {
    const { ecdsaProof, ecvrfProof } = Orand.transformProof(epochECVRFProof);
    const {
      ecdsaProof: { signer, receiverAddress, receiverEpoch, ecvrfProofDigest },
      currentEpochNumber,
      isEpochLinked,
      isValidDualProof,
      currentEpochResult,
      verifiedEpochResult,
    }: VerifyEpochProofResult = await this.orandProvider.verifyEpoch(ecdsaProof, ecvrfProof);
    return {
      ecdsaProof: { signer, receiverAddress, receiverEpoch, ecvrfProofDigest },
      currentEpochNumber,
      isEpochLinked,
      isValidDualProof,
      currentEpochResult,
      verifiedEpochResult,
    };
  }

  public async publish(proof: OrandEpoch, wallet: ContractRunner): Promise<ContractTransactionResponse> {
    const contract = this.orandProvider.connect(wallet as any);
    const { ecdsaProof, ecvrfProof } = Orand.transformProof(proof);

    const verifyEpoch = await this.verifyEpoch(proof);
    if (!verifyEpoch.isValidDualProof) {
      throw new Error('Invalid dual proof');
    }
    // If current epoch is 0, then it's genesis
    if (verifyEpoch.currentEpochResult === 0n) {
      return contract.genesis(ecdsaProof, ecvrfProof) as any;
    } else {
      return contract.publish(this.consumerAddress, ecvrfProof) as any;
    }
  }
}
