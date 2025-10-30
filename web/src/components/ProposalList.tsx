"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { DAO_ADDRESS, DAOVOTING_ABI } from "../lib/contracts";
import { getEthereum } from "../lib/ethereum";
import { Proposal, ProposalCard } from "./ProposalCard";

export function ProposalList() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [error, setError] = useState<string | null>(null);

  const contract = useMemo(() => {
    if (!DAO_ADDRESS) return null;
    const ethereum = getEthereum();
    if (!ethereum) return null;
    const provider = new ethers.BrowserProvider(ethereum as any);
    return new ethers.Contract(DAO_ADDRESS, DAOVOTING_ABI as any, provider);
  }, []);

  async function loadProposals() {
    setError(null);
    try {
      if (!contract) return;
      const next: bigint = await contract.nextProposalId();
      const items: Proposal[] = [];
      for (let i = 1n; i < next; i++) {
        const p = await contract.getProposal(i);
        if (p.id === 0n) continue;
        items.push(p as Proposal);
      }
      setProposals(items.reverse());
    } catch (e: any) {
      setError(e?.message || "Error al cargar propuestas");
    }
  }

  useEffect(() => {
    void loadProposals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract]);

  const now = Math.floor(Date.now() / 1000);

  return (
    <div className="flex flex-col gap-3">
      <div className="text-lg font-semibold">Propuestas</div>
      {error && <div className="text-xs text-red-600">{error}</div>}
      {!DAO_ADDRESS && (
        <div className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
          Define NEXT_PUBLIC_DAO_ADDRESS en .env.local para listar propuestas.
        </div>
      )}
      {proposals.length === 0 ? (
        <div className="text-sm text-neutral-500">No hay propuestas</div>
      ) : (
        <div className="grid gap-3">
          {proposals.map((p) => (
            <ProposalCard key={p.id.toString()} p={p} now={now} />
          ))}
        </div>
      )}
      <button
        onClick={() => loadProposals()}
        className="self-start px-3 py-1 rounded border hover:bg-neutral-50"
      >Actualizar</button>
    </div>
  );
}


