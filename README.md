# DAO con Votación Gasless

Una aplicación completa de DAO (Decentralized Autonomous Organization) que permite a los usuarios votar propuestas **sin pagar gas**, utilizando meta-transacciones EIP-2771.

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Arquitectura](#-arquitectura)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Uso](#-uso)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Testing](#-testing)
- [Scripts Útiles](#-scripts-útiles)

## ✨ Características

- ✅ **Votación Gasless**: Vota propuestas sin pagar gas usando meta-transacciones (EIP-2771)
- 🗳️ **Sistema de Propuestas**: Crea, vota y ejecuta propuestas de transferencia de fondos
- 💰 **Gestión de Fondos**: Depósito y retiro de ETH al DAO
- 🔐 **Seguridad**: Validación de firmas off-chain con nonces para prevenir replay attacks
- ⚡ **Ejecución Automática**: Daemon que ejecuta automáticamente propuestas aprobadas
- 🎨 **UI Moderna**: Interfaz web profesional con Next.js 15 y Tailwind CSS

## 🛠️ Tecnologías

### Smart Contracts
- **Solidity** ^0.8.20
- **Foundry** (Forge, Cast, Anvil)
- **OpenZeppelin Contracts** (ERC2771Context)

### Frontend
- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Ethers.js v6**
- **MetaMask** Integration

### Infraestructura
- **Anvil** (Red local de Ethereum)
- **EIP-2771** (Meta-transacciones)
- **EIP-712** (Firma de mensajes estructurados)

## 🏗️ Arquitectura

### Componentes Principales

```
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │
│                 │
│  - UI/UX        │
│  - MetaMask     │
│  - API Calls    │
└────────┬────────┘
         │
         │ HTTP
         ▼
┌─────────────────┐
│  API Routes     │
│                 │
│  - /api/relay   │ (Relayer para votación gasless)
│  - /api/daemon  │ (Ejecución automática)
└────────┬────────┘
         │
         │ RPC
         ▼
┌─────────────────┐
│   Anvil         │
│   (Local Node)  │
└────────┬────────┘
         │
         │ Blockchain
         ▼
┌─────────────────────────────────┐
│   Smart Contracts               │
│                                 │
│  - MinimalForwarder (EIP-2771)  │
│  - DAOVoting                    │
└─────────────────────────────────┘
```

### Flujo de Meta-Transacción (Votación Gasless)

```
1. Usuario firma mensaje off-chain (EIP-712)
   ↓
2. Frontend envía firma a /api/relay
   ↓
3. Relayer valida firma y nonce
   ↓
4. Relayer ejecuta transacción en MinimalForwarder
   ↓
5. MinimalForwarder valida y ejecuta en DAOVoting
   ↓
6. Voto registrado (usuario no pagó gas)
```

Para más detalles sobre la arquitectura, ver [ARCHITECTURE.md](./ARCHITECTURE.md).

## 📦 Instalación

### Prerrequisitos

- **Node.js** >= 18
- **Foundry** ([instalación](https://book.getfoundry.sh/getting-started/installation))
- **MetaMask** (extensión de navegador)

### Instalación Paso a Paso

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd 02-DAO
```

2. **Instalar dependencias de Smart Contracts**
```bash
cd sc
forge install
```

3. **Instalar dependencias del Frontend**
```bash
cd ../web
npm install
```

## ⚙️ Configuración

### Variables de Entorno

El proyecto incluye un script automatizado (`start-dev.sh`) que configura todo automáticamente. Si prefieres hacerlo manualmente:

1. **Crear archivo `.env.local` en `web/`**:
```env
NEXT_PUBLIC_DAO_ADDRESS=0x...
NEXT_PUBLIC_FORWARDER_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=31337
RPC_URL=http://127.0.0.1:8545
RELAYER_PRIVATE_KEY=0x...
RELAYER_ADDRESS=0x...
```

### Configurar MetaMask

1. Añadir red local:
   - **Nombre**: Anvil Local
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Moneda**: ETH

2. Importar cuenta de Anvil (para testing):
   - **Private Key**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - Esta cuenta tiene fondos ilimitados en Anvil

## 🚀 Uso

### Opción 1: Script Automatizado (Recomendado)

```bash
./start-dev.sh
```

Este script:
- ✅ Inicia Anvil si no está corriendo
- ✅ Despliega los contratos
- ✅ Actualiza `.env.local` con las direcciones
- ✅ Inicia Next.js

### Opción 2: Manual

1. **Iniciar Anvil**:
```bash
anvil
```

2. **Desplegar Contratos**:
```bash
cd sc
forge script script/Deploy.s.sol:Deploy --rpc-url http://127.0.0.1:8545 --broadcast
```

3. **Actualizar `.env.local`** con las direcciones de los contratos desplegados

4. **Iniciar Frontend**:
```bash
cd web
npm run dev
```

### Acceder a la Aplicación

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📖 Guía de Uso

### 1. Financiar el DAO

1. Conecta tu wallet (MetaMask)
2. Ve a la pestaña "Financiar DAO"
3. Ingresa la cantidad de ETH a depositar
4. Click en "Financiar"
5. Confirma la transacción en MetaMask

**Nota**: Necesitas tener al menos el 10% del balance total para crear propuestas.

### 2. Crear una Propuesta

1. Ve a la pestaña "Crear Propuesta"
2. Completa el formulario:
   - **Beneficiario**: Dirección Ethereum del receptor
   - **Monto**: Cantidad de ETH a transferir
   - **Deadline**: Horas hasta el cierre de votación
   - **Descripción**: Descripción de la propuesta
3. Click en "Crear Propuesta"
4. Confirma la transacción

### 3. Votar una Propuesta

1. Ve a la pestaña "Propuestas"
2. Selecciona una propuesta activa
3. Elige tu voto:
   - ✅ **A FAVOR**: Apoya la propuesta
   - ❌ **EN CONTRA**: Rechaza la propuesta
   - ⚪ **ABSTENCIÓN**: No toma posición
4. Opción de votación:
   - **Gasless (relayer paga)**: Marca el checkbox para votar sin pagar gas
   - **Gasless (yo pago gas)**: Desmarca para pagar el gas tú mismo
5. Confirma la firma (o transacción si pagas gas)

**Nota**: Puedes cambiar tu voto antes del deadline.

### 4. Ejecutar Propuesta

Las propuestas aprobadas (votos a favor > votos en contra) se ejecutan automáticamente después del deadline + 1 hora mediante el daemon. También puedes ejecutarlas manualmente si eres miembro del DAO:

1. Ve a la pestaña "Propuestas"
2. Busca propuestas con estado "Aprobada" y "Lista para ejecutar"
3. Click en "🚀 Ejecutar Propuesta"

## 📁 Estructura del Proyecto

```
02-DAO/
├── sc/                          # Smart Contracts (Foundry)
│   ├── src/
│   │   ├── MinimalForwarder.sol # Contrato EIP-2771
│   │   ├── DAOVoting.sol        # Contrato principal del DAO
│   │   └── mocks/
│   ├── test/                    # Tests de Foundry
│   ├── script/                  # Scripts de deployment
│   └── foundry.toml
│
├── web/                         # Frontend (Next.js)
│   ├── src/
│   │   ├── app/                 # App Router de Next.js
│   │   │   ├── api/             # API Routes
│   │   │   │   ├── relay/       # Relayer para gasless
│   │   │   │   └── daemon/      # Daemon de ejecución
│   │   │   └── page.tsx         # Página principal
│   │   ├── components/          # Componentes React
│   │   ├── hooks/               # Custom hooks
│   │   └── lib/                 # Utilidades
│   └── package.json
│
├── start-dev.sh                 # Script de desarrollo automatizado
├── advance-time.sh              # Script para adelantar tiempo en Anvil
└── README.md                    # Este archivo
```

## 🧪 Testing

### Tests de Smart Contracts

```bash
cd sc

# Ejecutar todos los tests
forge test

# Ejecutar tests con gas report
forge test --gas-report

# Ejecutar tests con coverage
forge coverage
```

### Tests Específicos

```bash
# Tests de MinimalForwarder
forge test --match-contract MinimalForwarder

# Tests de DAOVoting
forge test --match-contract DAOVoting

# Tests de votación gasless
forge test --match-contract DAOVotingGasless
```

## 🛠️ Scripts Útiles

### Scripts de Desarrollo

- **`start-dev.sh`**: Inicia todo el entorno de desarrollo
- **`advance-time.sh [segundos]`**: Adelanta el tiempo en Anvil (útil para probar deadlines)

Ejemplo:
```bash
# Adelantar 24 horas
./advance-time.sh 86400
```

### Scripts de Foundry

```bash
cd sc

# Compilar contratos
forge build

# Formatear código
forge fmt

# Generar gas snapshots
forge snapshot

# Desplegar en local
forge script script/Deploy.s.sol:Deploy --rpc-url http://127.0.0.1:8545 --broadcast
```

### Scripts de Next.js

```bash
cd web

# Desarrollo
npm run dev

# Build de producción
npm run build

# Ejecutar producción
npm start

# Linting
npm run lint
```

## 🔍 Funcionalidades Técnicas

### Meta-Transacciones (EIP-2771)

- **Firma Off-chain**: Los usuarios firman mensajes con EIP-712
- **Validación**: El relayer valida firmas antes de ejecutar
- **Nonces**: Previene ataques de replay
- **Gasless**: El relayer paga el gas por el usuario

### Seguridad

- ✅ Validación de firmas ECDSA
- ✅ Nonces únicos por usuario
- ✅ Verificación de deadlines
- ✅ Validación de balances
- ✅ Protección contra replay attacks

### Daemon de Ejecución

El daemon (`/api/daemon`) verifica automáticamente y ejecuta propuestas que:
- ✅ Hayan pasado el deadline
- ✅ Hayan pasado el período de seguridad (1 hora adicional)
- ✅ Tengan más votos a favor que en contra
- ✅ No hayan sido ejecutadas ya

## 📝 Notas Importantes

1. **Balance para Crear Propuestas**: Solo usuarios con ≥10% del balance total pueden crear propuestas
2. **Deadline**: El deadline marca el fin de la votación
3. **Ejecución**: Las propuestas se pueden ejecutar después de `deadline + 1 hora`
4. **Ejecución por Cualquiera**: En el contrato, cualquiera puede ejecutar propuestas aprobadas (patrón "execution by anyone")
5. **Votación Gasless**: Requiere que el relayer tenga fondos para pagar el gas

## 🐛 Solución de Problemas

### Anvil no inicia
```bash
# Verificar si el puerto está ocupado
lsof -i :8545

# Matar proceso si es necesario
kill $(lsof -ti:8545)
```

### Contratos no se despliegan
- Verifica que Anvil esté corriendo
- Revisa las claves privadas en `.env.local`
- Verifica los logs de Anvil: `tail -f /tmp/anvil.log`

### Frontend no se conecta
- Verifica que MetaMask esté configurada con la red local (Chain ID 31337)
- Revisa las variables de entorno en `.env.local`
- Verifica los logs de Next.js: `tail -f /tmp/nextjs.log`

### Votación Gasless falla
- Verifica que `RELAYER_PRIVATE_KEY` esté configurada
- Asegúrate que la cuenta del relayer tenga fondos
- Revisa los logs del relayer en la consola del navegador

## 📚 Recursos Adicionales

- [Foundry Book](https://book.getfoundry.sh/)
- [EIP-2771](https://eips.ethereum.org/EIPS/eip-2771)
- [EIP-712](https://eips.ethereum.org/EIPS/eip-712)
- [Next.js Documentation](https://nextjs.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/)

## 📄 Licencia

Este proyecto es parte de un curso educativo.

---

**¡Desarrollado con ❤️ usando Foundry y Next.js!**

