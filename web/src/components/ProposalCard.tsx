"use client";

import { useMemo, useState, useEffect } from "react";
import { ethers } from "ethers";
import { VoteButtons } from "./VoteButtons";
import { useCountdown } from "../hooks/useCountdown";
import { ExecuteProposalButton } from "./ExecuteProposalButton";
import { getEthereum } from "../lib/ethereum";

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
  const [recipientBalance, setRecipientBalance] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

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

  // Obtener balance del destinatario
  useEffect(() => {
    async function fetchRecipientBalance() {
      if (!p.recipient || !ethers.isAddress(p.recipient)) {
        setRecipientBalance(null);
        return;
      }

      const ethereum = getEthereum();
      if (!ethereum) {
        setRecipientBalance(null);
        return;
      }

      try {
        setLoadingBalance(true);
        const provider = new ethers.BrowserProvider(ethereum as any);
        const balance = await provider.getBalance(p.recipient);
        setRecipientBalance(ethers.formatEther(balance));
      } catch (e) {
        console.error("Error al obtener balance del destinatario:", e);
        setRecipientBalance(null);
      } finally {
        setLoadingBalance(false);
      }
    }

    // Obtener balance siempre que haya un destinatario válido
    if (p.recipient && ethers.isAddress(p.recipient)) {
      void fetchRecipientBalance();

      // Refrescar balance cuando se ejecute una propuesta (especialmente si es esta)
      const handleProposalExecuted = () => {
        setTimeout(() => {
          void fetchRecipientBalance();
        }, 2000);
      };

      window.addEventListener('proposalExecuted', handleProposalExecuted);
      return () => {
        window.removeEventListener('proposalExecuted', handleProposalExecuted);
      };
    } else {
      setRecipientBalance(null);
    }
  }, [p.executed, p.recipient]);

  // Usar hook de cuenta regresiva
  const countdown = useCountdown(deadlineTimestamp);
  
  // EXECUTION_DELAY = 1 hora (3600 segundos)
  const EXECUTION_DELAY = 3600;
  const executionTime = deadlineTimestamp + EXECUTION_DELAY;
  const executionCountdown = useCountdown(executionTime);
  
  // Verificar si se puede ejecutar
  const canExecute = useMemo(() => {
    if (p.executed) return false;
    if (p.votesFor <= p.votesAgainst) return false; // No aprobada
    return now >= executionTime; // Ha pasado el deadline + delay
  }, [p.executed, p.votesFor, p.votesAgainst, now, executionTime]);
  
  const executionDate = executionTime > 0 ? new Date(executionTime * 1000) : null;
  const executionFormatted = executionDate && !isNaN(executionDate.getTime())
    ? executionDate.toLocaleString("es-ES", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "Fecha inválida";

  const status = (() => {
    if (p.executed) return { text: "Ejecutada", color: "bg-neutral-100 text-neutral-700 border-neutral-300" };
    if (deadlineTimestamp > 0 && now < deadlineTimestamp) {
      return { text: "Activa", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
    if (p.votesFor > p.votesAgainst) {
      return { text: "Aprobada", color: "bg-blue-50 text-blue-700 border-blue-200" };
    }
    return { text: "Rechazada", color: "bg-rose-50 text-rose-700 border-rose-200" };
  })();

  const totalVotes = Number(p.votesFor) + Number(p.votesAgainst) + Number(p.votesAbstain);
  const forPercentage = totalVotes > 0 ? (Number(p.votesFor) / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (Number(p.votesAgainst) / totalVotes) * 100 : 0;

  return (
    <div className="border border-neutral-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Header con ID y Estado */}
      <div className={`px-6 py-4 border-b ${status.color}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-neutral-500">Propuesta #{p.id.toString()}</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${status.color}`}>
              {status.text}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {!p.executed && deadlineTimestamp > 0 && now < deadlineTimestamp && (
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="text-neutral-600">⏱️</span>
                <span className="text-neutral-700">Votación: {countdown}</span>
              </div>
            )}
            {!p.executed && deadlineTimestamp > 0 && now >= deadlineTimestamp && p.votesFor > p.votesAgainst && (
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="text-neutral-600">⏳</span>
                <span className="text-neutral-700">
                  {canExecute ? "✅ Lista para ejecutar" : `Ejecutable en: ${executionCountdown}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="px-6 py-5 space-y-4">
        {/* Descripción */}
        <div>
          <h3 className="text-sm font-medium text-neutral-700 mb-1">Descripción</h3>
          <p className={`text-sm ${!p.description ? "text-neutral-400 italic" : "text-neutral-600"}`}>
            {p.description || "(sin descripción)"}
          </p>
        </div>

        {/* Información de pago */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-neutral-500 mb-1">Beneficiario</p>
            <p className="text-sm font-mono text-neutral-700">{recipientFormatted}</p>
            {recipientBalance !== null && !loadingBalance && (
              <p className="text-xs text-neutral-500 mt-1">
                Balance: <span className="font-medium text-neutral-700">{recipientBalance} ETH</span>
                {p.executed && (
                  <span className="ml-2 text-emerald-600">✓ Recibió {amountFormatted} ETH</span>
                )}
              </p>
            )}
            {loadingBalance && (
              <p className="text-xs text-neutral-400 mt-1">Cargando balance...</p>
            )}
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">Monto</p>
            <p className="text-lg font-semibold text-emerald-600">{amountFormatted} ETH</p>
          </div>
        </div>

        {/* Votos con barras de progreso */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-neutral-600 flex items-center gap-1.5">
                <span className="text-emerald-500">✓</span> A favor
              </span>
              <span className="font-medium text-neutral-700">{p.votesFor.toString()}</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${forPercentage}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-neutral-600 flex items-center gap-1.5">
                <span className="text-rose-500">✗</span> En contra
              </span>
              <span className="font-medium text-neutral-700">{p.votesAgainst.toString()}</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div
                className="bg-rose-500 h-2 rounded-full transition-all"
                style={{ width: `${againstPercentage}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">Abstenciones</span>
            <span className="font-medium text-neutral-700">{p.votesAbstain.toString()}</span>
          </div>
        </div>

        {/* Información adicional */}
        <div className="pt-3 border-t border-neutral-100 space-y-2">
          <p className="text-xs text-neutral-500">
            <span className="font-medium">Deadline votación:</span> <span className="text-neutral-700">{deadlineFormatted}</span>
          </p>
          {!p.executed && deadlineTimestamp > 0 && p.votesFor > p.votesAgainst && (
            <p className="text-xs text-neutral-500">
              <span className="font-medium">Ejecutable desde:</span> <span className="text-neutral-700">{executionFormatted}</span>
            </p>
          )}
        </div>

        {/* Botones */}
        <div className="pt-2 space-y-2">
          {status.text === "Activa" && (
            <VoteButtons proposalId={p.id} proposalDeadline={p.deadline} />
          )}
          {canExecute && (
            <ExecuteProposalButton proposalId={p.id} />
          )}
        </div>
      </div>
    </div>
  );
}


