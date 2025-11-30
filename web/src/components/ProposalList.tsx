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
      if (!contract || !provider) return;
      
      // Verificar que el contrato existe en la dirección antes de llamar funciones
      try {
        const code = await provider.getCode(DAO_ADDRESS);
        if (code === "0x" || code === "0x0") {
          setError(`No hay contrato desplegado en la dirección ${DAO_ADDRESS}. Por favor, despliega el contrato primero.`);
          setProposals([]);
          return;
        }
      } catch (codeError) {
        console.error("Error al verificar código del contrato:", codeError);
        // Continuar de todas formas, puede ser un error de red
      }
      
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
      // Detectar específicamente cuando no hay contrato o la dirección es incorrecta
      if (e?.code === "BAD_DATA" || e?.code === "CALL_EXCEPTION" || e?.message?.includes("decode")) {
        setError(`No se puede conectar al contrato en ${DAO_ADDRESS}. Verifica que el contrato esté desplegado y que la dirección sea correcta.`);
      } else {
        const errorMsg = e?.message || e?.shortMessage || "Error desconocido";
        setError(`Error al cargar propuestas: ${errorMsg}. Verifica que el contrato esté desplegado correctamente en ${DAO_ADDRESS}.`);
      }
      console.error("Error completo:", e);
      setProposals([]);
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
    
    // Escuchar evento de voto para refrescar automáticamente
    const handleVoteSubmitted = () => {
      console.log('[ProposalList] Voto detectado, refrescando propuestas...');
      setTimeout(() => {
        void loadProposals();
      }, 3000); // Esperar 3 segundos para que la transacción se confirme
    };
    
    // Escuchar evento de ejecución de propuestas
    const handleProposalsExecuted = () => {
      console.log('[ProposalList] Propuestas ejecutadas, refrescando lista...');
      setTimeout(() => {
        void loadProposals();
      }, 2000);
    };
    
    // Escuchar evento de creación de propuestas
    const handleProposalCreated = () => {
      console.log('[ProposalList] Nueva propuesta creada, refrescando lista...');
      setTimeout(() => {
        void loadProposals();
      }, 2000); // Esperar 2 segundos para que la transacción se confirme
    };
    
    window.addEventListener('voteSubmitted', handleVoteSubmitted);
    window.addEventListener('proposalsExecuted', handleProposalsExecuted);
    window.addEventListener('proposalCreated', handleProposalCreated);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('voteSubmitted', handleVoteSubmitted);
      window.removeEventListener('proposalsExecuted', handleProposalsExecuted);
      window.removeEventListener('proposalCreated', handleProposalCreated);
    };
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
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-lg">
          <p className="font-medium mb-1">⚠️ Error al cargar propuestas</p>
          <p className="text-xs">{error}</p>
          {DAO_ADDRESS && (
            <p className="text-xs mt-2 text-red-600">
              Dirección configurada: <code className="bg-red-100 px-1 rounded">{DAO_ADDRESS}</code>
            </p>
          )}
        </div>
      )}
      {!DAO_ADDRESS && (
        <div className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <p className="font-medium mb-1">⚠️ Configuración requerida</p>
          <p className="text-xs">Define NEXT_PUBLIC_DAO_ADDRESS en web/.env.local para listar propuestas.</p>
          <p className="text-xs mt-2 text-yellow-600">
            Ejemplo: <code className="bg-yellow-100 px-1 rounded">NEXT_PUBLIC_DAO_ADDRESS=0x...</code>
          </p>
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
