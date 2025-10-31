import { NextRequest } from "next/server";
import { ethers } from "ethers";

const ABI = [
  { type: "function", name: "nextProposalId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "getProposal", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [
    { components: [
      { name: "id", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "votesFor", type: "uint256" },
      { name: "votesAgainst", type: "uint256" },
      { name: "votesAbstain", type: "uint256" },
      { name: "executed", type: "bool" },
    ], name: "", type: "tuple" }
  ]},
  { type: "function", name: "executeProposal", stateMutability: "nonpayable", inputs: [{ name: "proposalId", type: "uint256" }], outputs: [] },
  { type: "function", name: "EXECUTION_DELAY", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export async function GET(_req: NextRequest) {
  try {
    const dao = process.env.NEXT_PUBLIC_DAO_ADDRESS;
    const rpc = process.env.RPC_URL;
    let pk = process.env.RELAYER_PRIVATE_KEY || "";

    if (!dao || !rpc || !pk) {
      return Response.json({ error: "server_misconfigured" }, { status: 500 });
    }
    pk = pk.trim();
    if (!pk.startsWith("0x")) pk = `0x${pk}`;
    if (pk.length !== 66) return Response.json({ error: "invalid_relayer_private_key_format" }, { status: 400 });

    const provider = new ethers.JsonRpcProvider(rpc);
    const wallet = new ethers.Wallet(pk, provider);
    const contract = new ethers.Contract(dao, ABI as any, wallet);

    // Obtener el timestamp del bloque actual de Ethereum (no el tiempo del sistema)
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    if (!block?.timestamp) {
      return Response.json({ error: "could_not_get_block_timestamp" }, { status: 500 });
    }
    const now = BigInt(block.timestamp);
    
    // Obtener EXECUTION_DELAY del contrato
    const executionDelay = await contract.EXECUTION_DELAY();
    
    const next: bigint = await contract.nextProposalId();

    const executed: Array<{ id: string; tx: string }> = [];
    const skipped: Array<{ id: string; reason: string }> = [];

    for (let i = 1n; i < next; i++) {
      const p = await contract.getProposal(i);
      if (p.id === 0n) {
        skipped.push({ id: i.toString(), reason: "not_found" });
        continue;
      }
      if (p.executed) {
        skipped.push({ id: i.toString(), reason: "already_executed" });
        continue;
      }
      // Elegible si: deadline + EXECUTION_DELAY pasado y votosFor > votosAgainst
      const executionTime = p.deadline + executionDelay;
      if (now < executionTime) {
        skipped.push({ id: i.toString(), reason: `deadline_not_passed (deadline: ${p.deadline.toString()}, executionTime: ${executionTime.toString()}, now: ${now.toString()})` });
        continue;
      }
      if (p.votesFor <= p.votesAgainst) {
        skipped.push({ id: i.toString(), reason: "not_approved" });
        continue;
      }
      try {
        const tx = await contract.executeProposal(i, { gasLimit: 1_000_000 });
        const rc = await tx.wait();
        executed.push({ id: i.toString(), tx: rc?.hash ?? tx.hash });
      } catch (e: any) {
        skipped.push({ id: i.toString(), reason: e?.message || "execute_failed" });
      }
    }

    return Response.json({ executed, skipped }, { status: 200 });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "daemon_failed" }, { status: 500 });
  }
}


