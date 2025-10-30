export const DAOVOTING_ABI = [
  {
    "type": "function",
    "name": "fundDAO",
    "stateMutability": "payable",
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "getUserBalance",
    "stateMutability": "view",
    "inputs": [{ "name": "user", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }]
  },
  {
    "type": "function",
    "name": "totalDaoBalance",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }]
  }
] as const;

export const DAO_ADDRESS = process.env.NEXT_PUBLIC_DAO_ADDRESS ?? "";


