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
    "name": "createProposal",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "recipient", "type": "address" },
      { "name": "amount", "type": "uint256" },
      { "name": "deadline", "type": "uint256" },
      { "name": "description", "type": "string" }
    ],
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
  },
  {
    "type": "function",
    "name": "getProposal",
    "stateMutability": "view",
    "inputs": [{ "name": "proposalId", "type": "uint256" }],
    "outputs": [
      {
        "components": [
          { "name": "id", "type": "uint256" },
          { "name": "recipient", "type": "address" },
          { "name": "amount", "type": "uint256" },
          { "name": "deadline", "type": "uint256" },
          { "name": "description", "type": "string" },
          { "name": "votesFor", "type": "uint256" },
          { "name": "votesAgainst", "type": "uint256" },
          { "name": "votesAbstain", "type": "uint256" },
          { "name": "executed", "type": "bool" }
        ],
        "name": "",
        "type": "tuple"
      }
    ]
  },
  {
    "type": "function",
    "name": "nextProposalId",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }]
  },
  {
    "type": "function",
    "name": "vote",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "proposalId", "type": "uint256" },
      { "name": "voteType", "type": "uint8" }
    ],
    "outputs": []
  }
] as const;

export const DAO_ADDRESS = process.env.NEXT_PUBLIC_DAO_ADDRESS ?? "";


