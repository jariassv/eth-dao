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
      { name: "description", type: "string" },
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
    console.log(`[Daemon] Iniciando - Timestamp actual: ${now.toString()}, EXECUTION_DELAY: ${executionDelay.toString()}s (${Number(executionDelay)}s)`);
    
    const next: bigint = await contract.nextProposalId();
    console.log(`[Daemon] Total de propuestas a verificar: ${(next - 1n).toString()}`);

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
      
      // Debug: imprimir información detallada
      console.log(`[Daemon] Propuesta ${i.toString()}: deadline=${p.deadline.toString()}, executionTime=${executionTime.toString()}, now=${now.toString()}, votesFor=${p.votesFor.toString()}, votesAgainst=${p.votesAgainst.toString()}, executed=${p.executed}`);
      
      if (now < executionTime) {
        const timeRemaining = Number(executionTime - now);
        skipped.push({ id: i.toString(), reason: `deadline_not_passed (deadline: ${p.deadline.toString()}, executionTime: ${executionTime.toString()}, now: ${now.toString()}, remaining: ${timeRemaining}s)` });
        continue;
      }
      if (p.votesFor <= p.votesAgainst) {
        skipped.push({ id: i.toString(), reason: `not_approved (votesFor: ${p.votesFor.toString()}, votesAgainst: ${p.votesAgainst.toString()})` });
        continue;
      }
      try {
        // Verificar balance del DAO antes de ejecutar
        const daoBalance = await provider.getBalance(dao);
        if (daoBalance < p.amount) {
          skipped.push({ id: i.toString(), reason: `insufficient_funds (DAO: ${daoBalance.toString()}, Required: ${p.amount.toString()})` });
          continue;
        }
        
        const tx = await contract.executeProposal(i, { gasLimit: 1_000_000 });
        const rc = await tx.wait();
        executed.push({ id: i.toString(), tx: rc?.hash ?? tx.hash });
        console.log(`[Daemon] ✅ Propuesta ${i.toString()} ejecutada: ${rc?.hash ?? tx.hash}`);
      } catch (e: any) {
        const errorMsg = e?.message || e?.reason || "execute_failed";
        skipped.push({ id: i.toString(), reason: errorMsg });
        console.error(`[Daemon] ❌ Error al ejecutar propuesta ${i.toString()}:`, errorMsg);
      }
    }

    const result = {
      executed,
      skipped,
      timestamp: new Date().toISOString(),
      checkedProposals: (next - 1n).toString(),
    };
    
    console.log(`[Daemon] Completado: ${executed.length} ejecutadas, ${skipped.length} saltadas`);
    return Response.json(result, { status: 200 });
  } catch (e: any) {
    console.error("[Daemon] Error fatal:", e);
    return Response.json({ error: e?.message ?? "daemon_failed" }, { status: 500 });
  }
}


