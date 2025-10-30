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
  // Convertir deadline BigInt a timestamp y formatear fecha
  const deadlineTimestamp = Number(p.deadline);
  const deadlineDate = deadlineTimestamp > 0 ? new Date(deadlineTimestamp * 1000) : null;
  const deadlineFormatted = deadlineDate && !isNaN(deadlineDate.getTime()) 
    ? deadlineDate.toLocaleString("es-ES", { 
        year: "numeric", 
        month: "2-digit", 
        day: "2-digit", 
        hour: "2-digit", 
        minute: "2-digit" 
      })
    : "Fecha inválida";

  // Formatear dirección del beneficiario con checksum
  const recipientFormatted = p.recipient && ethers.isAddress(p.recipient)
    ? ethers.getAddress(p.recipient) // Aplica checksum
    : p.recipient || "N/A";

  // Formatear monto en ETH
  const amountFormatted = p.amount ? ethers.formatEther(p.amount) : "0";

  const status = (() => {
    if (p.executed) return "Ejecutada";
    if (deadlineTimestamp > 0 && now < deadlineTimestamp) return "Activa";
    if (p.votesFor > p.votesAgainst) return "Aprobada";
    return "Rechazada";
  })();

  return (
    <div className="border rounded p-4 flex flex-col gap-2">
      <div className="text-sm text-neutral-500">ID #{p.id.toString()}</div>
      <div className="text-sm">
        Beneficiario: <span className="font-mono text-xs">{recipientFormatted}</span>
      </div>
      <div className="text-sm">Monto: <b>{amountFormatted} ETH</b></div>
      <div className="text-sm">Deadline: {deadlineFormatted}</div>
      <div className="text-sm">
        Descripción: <span className={!p.description ? "text-neutral-400 italic" : ""}>
          {p.description || "(sin descripción)"}
        </span>
      </div>
      <div className="text-sm">Votos: ✅ {p.votesFor.toString()} | ❌ {p.votesAgainst.toString()} | ⚪ {p.votesAbstain.toString()}</div>
      <div className="text-sm">Estado: <b>{status}</b></div>
      {status === "Activa" && <VoteButtons proposalId={p.id} />}
    </div>
  );
}


