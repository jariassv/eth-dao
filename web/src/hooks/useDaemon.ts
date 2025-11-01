"use client";

import { useEffect, useRef } from "react";

/**
 * Hook que ejecuta el daemon periódicamente para ejecutar propuestas aprobadas
 * @param intervalMs - Intervalo en milisegundos (default: 30000 = 30 segundos)
 * @param enabled - Si está habilitado o no (default: true)
 */
export function useDaemon(intervalMs: number = 30000, enabled: boolean = true) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const runDaemon = async () => {
      // Prevenir ejecuciones concurrentes
      if (isRunningRef.current) {
        console.log("[useDaemon] Daemon ya está ejecutándose, saltando este ciclo");
        return;
      }

      isRunningRef.current = true;
      try {
        const startTime = Date.now();
        console.log(`[useDaemon] ⏰ Ejecutando daemon... (${new Date().toISOString()})`);
        const response = await fetch("/api/daemon");
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          console.error("[useDaemon] Error en daemon:", error);
          return;
        }

        const result = await response.json();
        
        if (result.executed && result.executed.length > 0) {
          console.log(`[useDaemon] ✅ ${result.executed.length} propuesta(s) ejecutada(s):`, result.executed);
          // Disparar evento para que ProposalList se actualice
          window.dispatchEvent(new CustomEvent("proposalsExecuted", { detail: result.executed }));
        }
        
        if (result.skipped && result.skipped.length > 0) {
          // Solo mostrar propuestas que NO están ejecutadas para no saturar los logs
          const notExecuted = result.skipped.filter((s: any) => !s.reason.includes("already_executed"));
          if (notExecuted.length > 0) {
            const reasons = notExecuted.map((s: any) => `${s.id}: ${s.reason}`).join(", ");
            console.log(`[useDaemon] ⏭️ ${notExecuted.length} propuesta(s) saltada(s): ${reasons}`);
          }
        }
        
        const duration = Date.now() - startTime;
        if (result.checkedProposals) {
          console.log(`[useDaemon] ✅ Completado en ${duration}ms - Verificadas ${result.checkedProposals} propuestas (${result.timestamp})`);
        }
      } catch (error) {
        console.error("[useDaemon] Error al ejecutar daemon:", error);
      } finally {
        isRunningRef.current = false;
      }
    };

    // Ejecutar inmediatamente al montar
    void runDaemon();

    // Configurar intervalo
    intervalRef.current = setInterval(() => {
      void runDaemon();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [intervalMs, enabled]);
}

