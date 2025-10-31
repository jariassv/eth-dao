"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { DAO_ADDRESS, DAOVOTING_ABI } from "../lib/contracts";
import { getEthereum } from "../lib/ethereum";
import { useWallet } from "../hooks/useWallet";
import { parseTransactionError } from "../lib/errorHandler";

export function FundingPanel() {
  const { address } = useWallet();
  const [amountEth, setAmountEth] = useState("0.1");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string>("-");
  const [daoBalance, setDaoBalance] = useState<string>("-");

  const contract = useMemo(() => {
    if (!DAO_ADDRESS) return null;
    const ethereum = getEthereum();
    if (!ethereum) return null;
    const provider = new ethers.BrowserProvider(ethereum as any);
    async function getWithSigner() {
      const signer = await provider.getSigner();
      return new ethers.Contract(DAO_ADDRESS, DAOVOTING_ABI as any, signer);
    }
    return {
      provider,
      instance: new ethers.Contract(DAO_ADDRESS, DAOVOTING_ABI as any, provider),
      getWithSigner,
    } as const;
  }, []);

  async function refreshBalances() {
    if (!contract?.instance) {
      setUserBalance("-");
      setDaoBalance("-");
      return;
    }

    // Si no hay dirección conectada, limpiar balances
    if (!address) {
      setUserBalance("0");
      setDaoBalance("-");
      return;
    }

    try {
      // Primero obtener el balance del usuario específico
      const userBalanceBigInt = await contract.instance.getUserBalance(address);
      const ub = ethers.formatEther(userBalanceBigInt);
      
      // Luego obtener el balance total del DAO
      const totalBalanceBigInt = await contract.instance.totalDaoBalance();
      const tb = ethers.formatEther(totalBalanceBigInt);
      
      // Actualizar estados con los valores obtenidos
      setUserBalance(ub);
      setDaoBalance(tb);
    } catch (e: any) {
      // Ignorar errores de detección automática (como symbol(), decimals(), etc.)
      if (e?.code === "CALL_EXCEPTION" && e?.data === null && !e?.transaction) {
        // Es un error de detección automática, ignorar silenciosamente
        return;
      }
      console.warn("Error al leer balances:", e);
      // En caso de error, mostrar 0 para el usuario por seguridad
      setUserBalance("0");
    }
  }

  useEffect(() => {
    // Limpiar balances inmediatamente cuando cambia la dirección
    if (!address) {
      setUserBalance("0");
      setDaoBalance("-");
      return;
    }

    // Refrescar balances con la nueva dirección
    void refreshBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, contract?.instance]);

  const onFund = async () => {
    setError(null);
    if (!address) return setError("Conecta tu wallet primero");
    if (!contract?.getWithSigner) return setError("Contrato no configurado");
    try {
      setSending(true);
      const value = ethers.parseEther(amountEth || "0");
      if (value === 0n) {
        setError("La cantidad debe ser mayor a 0");
        setSending(false);
        return;
      }
      const c = await contract.getWithSigner();
      // Enviar transacción directamente, ignorar errores de detección previa
      const tx = await c.fundDAO({ value });
      await tx.wait();
      await refreshBalances();
      setAmountEth("0.1"); // Resetear input después de éxito
    } catch (e: any) {
      // Ignorar errores de detección automática antes de enviar
      if (e?.code === "CALL_EXCEPTION" && e?.data === null && !e?.transaction) {
        // Error de detección, reintentar manualmente
        console.warn("Error de detección automática, reintentando...", e);
        try {
          const value = ethers.parseEther(amountEth || "0");
          const c = await contract.getWithSigner();
          const tx = await c.fundDAO({ value });
          await tx.wait();
          await refreshBalances();
          setAmountEth("0.1");
        } catch (retryError: any) {
          const errorMsg = parseTransactionError(retryError);
          setError(errorMsg);
          console.error("Error al fondear (reintento):", retryError);
        }
      } else {
        const errorMsg = parseTransactionError(e);
        setError(errorMsg);
        console.error("Error al fondear:", e);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 border rounded flex flex-col gap-3">
      <div className="text-lg font-semibold">Financiar DAO</div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          className="border px-3 py-2 rounded w-40"
          value={amountEth}
          onChange={(e) => setAmountEth(e.target.value)}
        />
        <span>ETH</span>
        <button
          onClick={onFund}
          disabled={sending || !address}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {sending ? "Enviando..." : "Depositar"}
        </button>
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
      <div className="text-sm text-neutral-700">
        <div>Tu balance en el DAO: <b>{userBalance}</b> ETH</div>
        <div>Balance total del DAO: <b>{daoBalance}</b> ETH</div>
      </div>
      {!DAO_ADDRESS && (
        <div className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
          Define NEXT_PUBLIC_DAO_ADDRESS en .env.local para habilitar depósitos.
        </div>
      )}
    </div>
  );
}


