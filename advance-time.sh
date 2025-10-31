#!/bin/bash

# Script para adelantar el tiempo en Anvil
# Uso: ./advance-time.sh [segundos]
# Ejemplo: ./advance-time.sh 86400  (adelanta 24 horas)

SECONDS=${1:-86400}  # Por defecto 24 horas si no se especifica
RPC_URL="http://127.0.0.1:8545"

echo "Adelantando tiempo en $SECONDS segundos ($(($SECONDS / 3600)) horas)..."
NEW_TIME=$(cast rpc evm_increaseTime "$SECONDS" --rpc-url "$RPC_URL" 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "Minando bloque para aplicar el cambio..."
    cast rpc evm_mine --rpc-url "$RPC_URL" > /dev/null
    echo "✓ Tiempo adelantado correctamente"
    echo "Nuevo timestamp: $NEW_TIME"
else
    echo "✗ Error al adelantar el tiempo. Verifica que Anvil esté corriendo."
    exit 1
fi

