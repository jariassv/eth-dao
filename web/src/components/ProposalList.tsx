"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { DAO_ADDRESS, DAOVOTING_ABI, DAOVOTING_ABI_OLD } from "../lib/contracts";
import { getEthereum } from "../lib/ethereum";
import { Proposal, ProposalCard } from "./ProposalCard";

export function ProposalList() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [usingOldABI, setUsingOldABI] = useState(false);
  const [now, setNow] = useState<number>(0);

  const { contract, provider } = useMemo(() => {
    if (!DAO_ADDRESS) return { contract: null, provider: null };
    const ethereum = getEthereum();
    if (!ethereum) return { contract: null, provider: null };
    const providerInstance = new ethers.BrowserProvider(ethereum as any);
    const abi = usingOldABI ? DAOVOTING_ABI_OLD : DAOVOTING_ABI;
    const contractInstance = new ethers.Contract(DAO_ADDRESS, abi as any, providerInstance);
    return { contract: contractInstance, provider: providerInstance };
  }, [usingOldABI]);

  async function loadProposals() {
    setError(null);
    try {
      if (!contract) return;
      const next: bigint = await contract.nextProposalId();
      
      if (next === 1n) {
        // No hay propuestas aún
        setProposals([]);
        return;
      }
      
      const items: Proposal[] = [];
      let hasDecodeError = false;
      
      for (let i = 1n; i < next; i++) {
        try {
          const p = await contract.getProposal(i);
          if (p.id === 0n) continue;
          // Extraer valores de forma segura del proxy de ethers
          // Manejar description de forma segura (puede no existir en versión antigua)
          let descriptionValue = "";
          try {
            if (p.description !== undefined && p.description !== null) {
              descriptionValue = String(p.description);
            }
          } catch {
            // description no existe en esta versión del contrato
          }

          const proposal: Proposal = {
            id: BigInt(p.id.toString()),
            recipient: String(p.recipient || ""),
            amount: BigInt(p.amount.toString()),
            deadline: BigInt(p.deadline.toString()),
            description: descriptionValue,
            votesFor: BigInt(p.votesFor.toString()),
            votesAgainst: BigInt(p.votesAgainst.toString()),
            votesAbstain: BigInt(p.votesAbstain.toString()),
            executed: Boolean(p.executed),
          };
          items.push(proposal);
        } catch (e: any) {
          // Si es error de decodificación y aún no estamos usando el ABI viejo, intentar cambiar
          if ((e?.code === "BAD_DATA" || e?.message?.includes("decode")) && !usingOldABI) {
            hasDecodeError = true;
            break; // Salir del loop para intentar con ABI viejo
          }
          console.error(`Error al leer propuesta ${i}:`, e);
          // Continuar con las demás propuestas
        }
      }
      
      // Si hubo error de decodificación y no estamos usando ABI viejo, intentar cambiar
      if (hasDecodeError && !usingOldABI) {
        console.warn("Error de decodificación detectado, intentando con ABI de versión antigua...");
        setUsingOldABI(true);
        return; // Se volverá a ejecutar con el nuevo ABI
      }
      
      setProposals(items.reverse());
    } catch (e: any) {
      const errorMsg = e?.message || e?.shortMessage || "Error desconocido";
      setError(`Error al cargar propuestas: ${errorMsg}. Verifica que el contrato esté desplegado correctamente en ${DAO_ADDRESS}.`);
      console.error("Error completo:", e);
    }
  }

  // Obtener el timestamp del bloque actual de Ethereum
  async function updateBlockTimestamp() {
    if (!provider) return;
    try {
      const blockNumber = await provider.getBlockNumber();
      const block = await provider.getBlock(blockNumber);
      if (block?.timestamp) {
        setNow(Number(block.timestamp));
      }
    } catch (e) {
      console.error("Error al obtener timestamp del bloque:", e);
      // Fallback al tiempo del sistema si falla
      setNow(Math.floor(Date.now() / 1000));
    }
  }

  useEffect(() => {
    void loadProposals();
    void updateBlockTimestamp();
    // Actualizar cada 5 segundos
    const interval = setInterval(() => {
      void updateBlockTimestamp();
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, provider, usingOldABI]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-neutral-800">Propuestas</h2>
        <button
          onClick={() => loadProposals()}
          className="px-4 py-2 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-sm font-medium transition-colors"
        >Actualizar</button>
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
      {!DAO_ADDRESS && (
        <div className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
          Define NEXT_PUBLIC_DAO_ADDRESS en .env.local para listar propuestas.
        </div>
      )}
      {proposals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-neutral-200">
          <p className="text-neutral-500">No hay propuestas disponibles</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {proposals.map((p) => (
            <ProposalCard key={p.id.toString()} p={p} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}
