import { ethers } from "ethers";

export type ForwardRequest = {
  from: string;
  to: string;
  value: bigint;
  gas: bigint;
  nonce: bigint;
  data: string;
};

export const MINIMAL_FORWARDER_ABI = [
  {
    type: "function",
    name: "getNonce",
    stateMutability: "view",
    inputs: [{ name: "from", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "verify",
    stateMutability: "view",
    inputs: [
      {
        name: "req",
        type: "tuple",
        components: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
      },
      { name: "signature", type: "bytes" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "execute",
    stateMutability: "payable",
    inputs: [
      {
        name: "req",
        type: "tuple",
        components: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
      },
      { name: "signature", type: "bytes" },
    ],
    outputs: [
      { name: "success", type: "bool" },
      { name: "returndata", type: "bytes" },
    ],
  },
] as const;

export const FORWARDER_ADDRESS = process.env.NEXT_PUBLIC_FORWARDER_ADDRESS ?? "";

export const FORWARD_REQUEST_TYPES = {
  ForwardRequest: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "gas", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "data", type: "bytes" },
  ],
} as const;

export function buildEip712Domain(chainId: number, verifyingContract: string) {
  return {
    name: "MinimalForwarder",
    version: "0.0.1",
    chainId,
    verifyingContract,
  } as const;
}

export function encodeVoteData(daoInterface: ethers.Interface, proposalId: bigint, voteType: number) {
  return daoInterface.encodeFunctionData("vote", [proposalId, voteType]);
}


