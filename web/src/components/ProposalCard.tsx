"use client";

import { ethers } from "ethers";
import { VoteButtons } from "./VoteButtons";

export type Proposal = {
  id: bigint;
  recipient: string;
  amount: bigint;
  deadline: bigint;
  description: string;
  votesFor: bigint;
  votesAgainst: bigint;
  votesAbstain: bigint;
  executed: boolean;
};

export function ProposalCard({ p, now }: { p: Proposal; now: number }) {
  const status = (() => {
    const dl = Number(p.deadline);
    if (p.executed) return "Ejecutada";
    if (now < dl) return "Activa";
    if (p.votesFor > p.votesAgainst) return "Aprobada";
    return "Rechazada";
  })();

  return (
    <div className="border rounded p-4 flex flex-col gap-2">
      <div className="text-sm text-neutral-500">ID #{p.id.toString()}</div>
      <div className="text-sm">Beneficiario: <span className="font-mono">{p.recipient}</span></div>
      <div className="text-sm">Monto: <b>{ethers.formatEther(p.amount)} ETH</b></div>
      <div className="text-sm">Deadline: {new Date(Number(p.deadline) * 1000).toLocaleString()}</div>
      <div className="text-sm">Descripción: {p.description || "-"}</div>
      <div className="text-sm">Votos: ✅ {p.votesFor.toString()} | ❌ {p.votesAgainst.toString()} | ⚪ {p.votesAbstain.toString()}</div>
      <div className="text-sm">Estado: <b>{status}</b></div>
      {status === "Activa" && <VoteButtons proposalId={p.id} />}
    </div>
  );
}


