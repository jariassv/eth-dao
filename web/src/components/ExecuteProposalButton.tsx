"use client";

import { useState, useMemo, useEffect } from "react";
import { ethers } from "ethers";
import { DAO_ADDRESS, DAOVOTING_ABI } from "../lib/contracts";
import { getEthereum } from "../lib/ethereum";
import { useWallet } from "../hooks/useWallet";
import { parseTransactionError } from "../lib/errorHandler";

export function ExecuteProposalButton({ proposalId }: { proposalId: bigint }) {
  const { address } = useWallet();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<bigint>(0n);
  const [loadingBalance, setLoadingBalance] = useState(true);

  const { contract, readOnlyContract } = useMemo(() => {
    if (!DAO_ADDRESS) return { contract: null, readOnlyContract: null };
    const ethereum = getEthereum();
    if (!ethereum) return { contract: null, readOnlyContract: null };
    const provider = new ethers.BrowserProvider(ethereum as any);
    async function get() {
      const signer = await provider.getSigner();
      return new ethers.Contract(DAO_ADDRESS, DAOVOTING_ABI as any, signer);
    }
    const readOnly = new ethers.Contract(DAO_ADDRESS, DAOVOTING_ABI as any, provider);
    return { contract: { get }, readOnlyContract: readOnly };
  }, []);

  // Verificar balance del usuario
  useEffect(() => {
    async function checkBalance() {
      if (!address || !readOnlyContract) {
        setUserBalance(0n);
        setLoadingBalance(false);
        return;
      }
      try {
        setLoadingBalance(true);
        const balance = await readOnlyContract.getUserBalance(address);
        setUserBalance(BigInt(balance.toString()));
      } catch (e) {
        console.error("Error al verificar balance:", e);
        setUserBalance(0n);
      } finally {
        setLoadingBalance(false);
      }
    }
    void checkBalance();
  }, [address, readOnlyContract]);

  const execute = async () => {
    setError(null);
    if (!address) return setError("Conecta tu wallet primero");
    if (!contract?.get) return setError("Contrato no configurado");
    try {
      setSending(true);
      const c = await contract.get();
      const tx = await c.executeProposal(proposalId);
      
      // Esperar confirmación de la transacción
      const receipt = await tx.wait();
      console.log('Propuesta ejecutada, bloque confirmado:', receipt.blockNumber);
      
      // Disparar evento para refrescar propuestas y balances inmediatamente
      window.dispatchEvent(new Event('proposalExecuted'));
      
      // Disparar eventos adicionales con un pequeño delay para asegurar actualización
      setTimeout(() => {
        window.dispatchEvent(new Event('proposalExecuted'));
      }, 1000);
      
      setTimeout(() => {
        window.dispatchEvent(new Event('proposalExecuted'));
      }, 3000);
      
      // Mostrar mensaje de éxito
      setError(null);
      
      // Recargar después de un delay para asegurar que todo se actualice
      setTimeout(() => {
        window.location.reload();
      }, 4000);
    } catch (e: any) {
      const errorMsg = parseTransactionError(e);
      setError(errorMsg);
      console.error("Error al ejecutar propuesta:", e);
    } finally {
      setSending(false);
    }
  };

  // Solo mostrar botón si el usuario es miembro del DAO (tiene balance > 0)
  // Nota: En el contrato cualquiera puede ejecutar (patrón "execution by anyone"),
  // pero la UI solo muestra el botón a miembros para mejor UX.
  // El daemon ejecutará automáticamente propuestas elegibles.
  if (loadingBalance) {
    return (
      <div className="text-xs text-neutral-500 text-center py-2">
        Verificando permisos...
      </div>
    );
  }

  if (!address || userBalance === 0n) {
    return (
      <div className="text-xs text-neutral-500 text-center py-2 border border-neutral-200 rounded-lg bg-neutral-50">
        <p>El daemon ejecutará esta propuesta automáticamente,</p>
        <p>o cualquier miembro del DAO puede ejecutarla manualmente.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={execute}
        disabled={sending || !address}
        className="w-full px-4 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
      >
        {sending ? "Ejecutando..." : "🚀 Ejecutar Propuesta"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
