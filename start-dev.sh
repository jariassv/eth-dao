#!/bin/bash

set -e

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SC_DIR="$SCRIPT_DIR/sc"
WEB_DIR="$SCRIPT_DIR/web"

echo -e "${GREEN}=== Iniciando entorno de desarrollo DAO ===${NC}"

# Función para verificar si un puerto está en uso
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Puerto en uso
    else
        return 1  # Puerto libre
    fi
}

# Función para matar proceso en un puerto
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}Cerrando proceso en puerto $port (PID: $pid)${NC}"
        kill $pid 2>/dev/null || true
        sleep 1
    fi
}

# 1. Verificar e iniciar Anvil
echo -e "${GREEN}[1/4] Verificando Anvil...${NC}"
if check_port 8545; then
    echo -e "${GREEN}✓ Anvil ya está corriendo en puerto 8545${NC}"
else
    echo -e "${YELLOW}Iniciando Anvil en background...${NC}"
    cd "$SCRIPT_DIR"
    nohup anvil > /tmp/anvil.log 2>&1 &
    ANVIL_PID=$!
    echo $ANVIL_PID > /tmp/anvil.pid
    sleep 2
    
    if check_port 8545; then
        echo -e "${GREEN}✓ Anvil iniciado correctamente (PID: $ANVIL_PID)${NC}"
    else
        echo -e "${RED}✗ Error: No se pudo iniciar Anvil${NC}"
        exit 1
    fi
fi

# 2. Desplegar contratos (antes de iniciar Next.js para tener las direcciones)
echo -e "${GREEN}[2/4] Desplegando contratos...${NC}"
cd "$SC_DIR"

# Obtener primera private key de Anvil (si no está definida)
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${YELLOW}No se encontró PRIVATE_KEY, usando la primera cuenta de Anvil${NC}"
    # Anvil usa esta clave por defecto para la primera cuenta
    export PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
fi

# Desplegar
echo -e "${YELLOW}Ejecutando deployment...${NC}"
DEPLOY_OUTPUT=$(forge script script/Deploy.s.sol:Deploy \
    --rpc-url http://127.0.0.1:8545 \
    --broadcast \
    -vvv 2>&1)

# Extraer direcciones de los contratos (múltiples métodos)
FORWARDER_ADDR=$(echo "$DEPLOY_OUTPUT" | grep -oP 'MinimalForwarder:\s*\K0x[a-fA-F0-9]{40}' | head -1)
DAO_ADDR=$(echo "$DEPLOY_OUTPUT" | grep -oP 'DAOVoting:\s*\K0x[a-fA-F0-9]{40}' | head -1)

# Si no se encuentran con grep, intentar desde el output directo
if [ -z "$FORWARDER_ADDR" ] || [ -z "$DAO_ADDR" ]; then
    echo -e "${YELLOW}Intentando método alternativo 1: buscar en output...${NC}"
    FORWARDER_ADDR=$(echo "$DEPLOY_OUTPUT" | grep -i "MinimalForwarder" | grep -oP '0x[a-fA-F0-9]{40}' | head -1)
    DAO_ADDR=$(echo "$DEPLOY_OUTPUT" | grep -i "DAOVoting" | grep -oP '0x[a-fA-F0-9]{40}' | head -1)
fi

# Si aún no se encuentran, buscar en archivos de broadcast
if [ -z "$FORWARDER_ADDR" ] || [ -z "$DAO_ADDR" ]; then
    echo -e "${YELLOW}Intentando método alternativo 2: buscar en archivos de broadcast...${NC}"
    BROADCAST_DIR="$SC_DIR/broadcast/Deploy.s.sol/31337"
    if [ -d "$BROADCAST_DIR" ]; then
        LATEST_RUN=$(ls -td "$BROADCAST_DIR"/*/ 2>/dev/null | head -1)
        if [ ! -z "$LATEST_RUN" ]; then
            DEPLOY_JSON="$LATEST_RUN/run-latest.json"
            if [ -f "$DEPLOY_JSON" ]; then
                # Usar jq si está disponible, sino grep
                if command -v jq &> /dev/null; then
                    FORWARDER_ADDR=$(jq -r '.transactions[] | select(.contractName=="MinimalForwarder") | .contractAddress' "$DEPLOY_JSON" 2>/dev/null | head -1)
                    DAO_ADDR=$(jq -r '.transactions[] | select(.contractName=="DAOVoting") | .contractAddress' "$DEPLOY_JSON" 2>/dev/null | head -1)
                else
                    FORWARDER_ADDR=$(grep -A 5 "MinimalForwarder" "$DEPLOY_JSON" | grep -oP '"contractAddress"\s*:\s*"\K0x[a-fA-F0-9]{40}' | head -1)
                    DAO_ADDR=$(grep -A 5 "DAOVoting" "$DEPLOY_JSON" | grep -oP '"contractAddress"\s*:\s*"\K0x[a-fA-F0-9]{40}' | head -1)
                fi
            fi
        fi
    fi
fi

if [ -z "$FORWARDER_ADDR" ] || [ -z "$DAO_ADDR" ]; then
    echo -e "${RED}✗ Error: No se pudieron extraer las direcciones de los contratos${NC}"
    echo -e "${YELLOW}Output del deployment:${NC}"
    echo "$DEPLOY_OUTPUT" | tail -30
    echo -e "\n${YELLOW}Por favor, verifica manualmente las direcciones en el output arriba${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Contratos desplegados:${NC}"
echo -e "  Forwarder: $FORWARDER_ADDR"
echo -e "  DAO: $DAO_ADDR"

# Obtener RELAYER_PRIVATE_KEY y RELAYER_ADDRESS si no están definidos
if [ -z "$RELAYER_PRIVATE_KEY" ] || [ "$RELAYER_PRIVATE_KEY" = "0x" ]; then
    echo -e "${YELLOW}No se encontró RELAYER_PRIVATE_KEY, usando la segunda cuenta de Anvil${NC}"
    RELAYER_PRIVATE_KEY="0x59c6995e998f97a5a0044976f6c54e6cdf73e76b5b6e2f0c8d9c0b3a1f4f5c6d"
    RELAYER_ADDRESS=$(cast wallet address $RELAYER_PRIVATE_KEY 2>/dev/null || echo "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
fi

# 3. Actualizar .env.local
echo -e "${GREEN}[3/4] Actualizando .env.local...${NC}"
cd "$WEB_DIR"

ENV_FILE=".env.local"
BACKUP_FILE=".env.local.backup.$(date +%Y%m%d_%H%M%S)"

# Hacer backup
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✓ Backup creado: $BACKUP_FILE${NC}"
fi

# Actualizar o crear .env.local
cat > "$ENV_FILE" << EOF
# Actualizado automáticamente por start-dev.sh el $(date)
NEXT_PUBLIC_DAO_ADDRESS=$DAO_ADDR
NEXT_PUBLIC_FORWARDER_ADDRESS=$FORWARDER_ADDR
NEXT_PUBLIC_CHAIN_ID=31337
RPC_URL=http://127.0.0.1:8545
RELAYER_PRIVATE_KEY=$RELAYER_PRIVATE_KEY
RELAYER_ADDRESS=$RELAYER_ADDRESS
EOF

echo -e "${GREEN}✓ .env.local actualizado${NC}"

# 4. Verificar e iniciar/reiniciar Next.js para cargar nuevas variables
echo -e "${GREEN}[4/4] Verificando Next.js...${NC}"
if check_port 3000; then
    echo -e "${YELLOW}Reiniciando Next.js para cargar nuevas variables de entorno...${NC}"
    kill_port 3000
    sleep 2
fi

echo -e "${YELLOW}Iniciando Next.js en background...${NC}"
cd "$WEB_DIR"

nohup npm run dev > /tmp/nextjs.log 2>&1 &
NEXT_PID=$!
echo $NEXT_PID > /tmp/nextjs.pid
sleep 3

if check_port 3000; then
    echo -e "${GREEN}✓ Next.js iniciado correctamente (PID: $NEXT_PID)${NC}"
else
    echo -e "${YELLOW}⚠ Next.js puede estar iniciando aún, verifica manualmente${NC}"
fi

# Mostrar resumen
echo -e "\n${GREEN}=== Resumen ===${NC}"
echo -e "${GREEN}✓ Anvil corriendo en http://127.0.0.1:8545${NC}"
echo -e "${GREEN}✓ Next.js corriendo en http://localhost:3000${NC}"
echo -e "${GREEN}✓ Contratos desplegados:${NC}"
echo -e "   DAO: $DAO_ADDR"
echo -e "   Forwarder: $FORWARDER_ADDR"
echo -e "${GREEN}✓ Variables de entorno actualizadas en web/.env.local${NC}"
echo -e "\n${YELLOW}Para detener los servicios:${NC}"
echo -e "  kill \$(cat /tmp/anvil.pid)  # Detener Anvil"
echo -e "  kill \$(cat /tmp/nextjs.pid)  # Detener Next.js"
echo -e "\n${YELLOW}Logs:${NC}"
echo -e "  tail -f /tmp/anvil.log  # Logs de Anvil"
echo -e "  tail -f /tmp/nextjs.log  # Logs de Next.js"
echo -e "\n${GREEN}¡Todo listo! 🚀${NC}"

