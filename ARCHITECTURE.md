# Arquitectura del Proyecto DAO

Este documento describe en detalle la arquitectura técnica del sistema DAO con votación gasless.

## 📐 Diagramas de Arquitectura

### 1. Arquitectura General del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Next.js 15 Application                                  │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │  Components  │  │    Hooks     │  │    Lib       │  │  │
│  │  │  - Header    │  │  - useWallet │  │  - contracts │  │  │
│  │  │  - Sidebar   │  │  - useCount  │  │  - forwarder │  │  │
│  │  │  - Proposal* │  │    down      │  │  - ethereum  │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTP/WebSocket
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      API LAYER                                  │
│  ┌────────────────────────┐  ┌────────────────────────┐        │
│  │   /api/relay           │  │   /api/daemon          │        │
│  │   (Meta-transactions)  │  │   (Auto-execution)     │        │
│  └────────────────────────┘  └────────────────────────┘        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ JSON-RPC
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                   BLOCKCHAIN LAYER                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Anvil (Local Ethereum Node)                             │  │
│  │  - Chain ID: 31337                                       │  │
│  │  - RPC: http://127.0.0.1:8545                            │  │
│  └───────────────────────────┬──────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────▼──────────────────────────────┐  │
│  │  Smart Contracts                                         │  │
│  │  ┌──────────────────┐  ┌──────────────────┐             │  │
│  │  │ MinimalForwarder │──▶│   DAOVoting      │             │  │
│  │  │ (EIP-2771)       │  │ (ERC2771Context) │             │  │
│  │  └──────────────────┘  └──────────────────┘             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Flujo de Meta-Transacción (Votación Gasless)

```
┌──────────┐
│ Usuario  │
└────┬─────┘
     │
     │ 1. Firma mensaje EIP-712
     │    (off-chain, no paga gas)
     ▼
┌──────────────────┐
│  Frontend        │
│  - EIP-712 Sign  │
└────┬─────────────┘
     │
     │ 2. POST /api/relay
     │    { signature, request }
     ▼
┌──────────────────┐
│  API Route       │
│  /api/relay      │
│                  │
│  3. Valida firma │
│  4. Verifica nonce│
│  5. Ejecuta tx   │
└────┬─────────────┘
     │
     │ 6. execute() en MinimalForwarder
     │    (relayer paga gas)
     ▼
┌──────────────────┐
│ MinimalForwarder │
│                  │
│  7. Verifica firma│
│  8. Verifica nonce│
│  9. Ejecuta call │
└────┬─────────────┘
     │
     │ 10. vote() en DAOVoting
     ▼
┌──────────────────┐
│   DAOVoting      │
│                  │
│  11. Registra voto│
│  12. Emite evento│
└──────────────────┘
```

### 3. Flujo de Ejecución de Propuesta

```
┌──────────────────────────────────────────────────────────────┐
│                  DAEMON PROCESS                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Cron Job / Scheduled Task                             │ │
│  │  GET /api/daemon cada X segundos                       │ │
│  └────────────────────────────┬───────────────────────────┘ │
│                               │                              │
│                               │ 1. Obtiene todas propuestas │
│                               ▼                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Para cada propuesta:                                  │ │
│  │  - Verifica deadline pasado                            │ │
│  │  - Verifica deadline + EXECUTION_DELAY pasado          │ │
│  │  - Verifica votosFor > votosAgainst                    │ │
│  │  - Verifica no ejecutada                               │ │
│  └────────────────────────────┬───────────────────────────┘ │
│                               │                              │
│                               │ 2. Ejecuta propuesta elegible│
│                               ▼                              │
└───────────────────────────────┼──────────────────────────────┘
                                │
                                │ 3. executeProposal(id)
                                ▼
                    ┌───────────────────────┐
                    │    DAOVoting          │
                    │                       │
                    │  4. Valida condiciones│
                    │  5. Marca ejecutada   │
                    │  6. Transfiere ETH    │
                    │  7. Actualiza balance │
                    │  8. Emite evento      │
                    └───────────────────────┘
```

### 4. Arquitectura de Contratos

```
┌──────────────────────────────────────────────────────────────┐
│                    MinimalForwarder                          │
│  (Implementa EIP-2771)                                       │
│                                                              │
│  + verify(ForwardRequest, signature) → bool                  │
│  + execute(ForwardRequest, signature) → (bool, bytes)       │
│  + getNonce(address) → uint256                               │
│                                                              │
│  Estado:                                                     │
│    - nonces[address] → uint256                               │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ Hereda/Usa
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                    DAOVoting                                 │
│  (Hereda ERC2771Context)                                     │
│                                                              │
│  Funciones Principales:                                      │
│    + fundDAO() payable                                       │
│    + createProposal(recipient, amount, deadline, desc)       │
│    + vote(proposalId, VoteType)                              │
│    + executeProposal(proposalId)                             │
│                                                              │
│  Funciones View:                                             │
│    + getProposal(id) → Proposal                              │
│    + getUserBalance(user) → uint256                          │
│    + hasVotedForProposal(id, user) → bool                    │
│    + getUserVote(id, user) → VoteType                        │
│                                                              │
│  Estado:                                                     │
│    - proposals[id] → Proposal                                │
│    - userBalances[user] → uint256                            │
│    - hasVoted[id][user] → bool                               │
│    - userVote[id][user] → VoteType                           │
└──────────────────────────────────────────────────────────────┘
```

### 5. Estructura de Datos

#### Proposal
```solidity
struct Proposal {
    uint256 id;              // ID único de la propuesta
    address recipient;       // Beneficiario de la transferencia
    uint256 amount;          // Monto en wei a transferir
    uint256 deadline;        // Timestamp del deadline
    string description;      // Descripción de la propuesta
    uint256 votesFor;        // Contador de votos a favor
    uint256 votesAgainst;    // Contador de votos en contra
    uint256 votesAbstain;    // Contador de abstenciones
    bool executed;           // Estado de ejecución
}
```

#### ForwardRequest (EIP-2771)
```solidity
struct ForwardRequest {
    address from;            // Usuario original
    address to;              // Contrato destino (DAOVoting)
    uint256 value;           // Valor a enviar (0 para votos)
    uint256 gas;             // Gas a usar
    uint256 nonce;           // Nonce del usuario
    bytes data;              // Calldata (función a ejecutar)
}
```

## 🔄 Flujos de Usuario

### Flujo 1: Financiar DAO

```
Usuario → Frontend → MetaMask → Transaction → Anvil → DAOVoting.fundDAO()
                                                          ↓
                                                    Actualiza balance
                                                          ↓
                                                    Emite evento Funded
```

### Flujo 2: Crear Propuesta

```
Usuario → Frontend → Validación (≥10% balance) → MetaMask → Transaction
                                                              ↓
                                                        Anvil
                                                              ↓
                                                    DAOVoting.createProposal()
                                                              ↓
                                                    Crea propuesta con ID
                                                              ↓
                                                    Emite evento ProposalCreated
```

### Flujo 3: Votar (Normal)

```
Usuario → Frontend → MetaMask → Transaction → Anvil → DAOVoting.vote()
                                                          ↓
                                                    Actualiza votos
                                                          ↓
                                                    Emite evento Voted
```

### Flujo 4: Votar (Gasless)

Ver diagrama "Flujo de Meta-Transacción" arriba.

### Flujo 5: Ejecutar Propuesta

Ver diagrama "Flujo de Ejecución de Propuesta" arriba.

## 🔐 Seguridad

### Medidas de Seguridad Implementadas

1. **Validación de Firmas (ECDSA)**
   - Verificación criptográfica de todas las meta-transacciones
   - Prevención de firmas falsificadas

2. **Nonces**
   - Cada usuario tiene un nonce único
   - Previene ataques de replay
   - Incrementado automáticamente después de cada ejecución

3. **Validaciones de Estado**
   - Verificación de deadlines
   - Verificación de balances
   - Verificación de permisos (10% para crear propuestas)

4. **Período de Seguridad (EXECUTION_DELAY)**
   - 1 hora adicional después del deadline
   - Permite tiempo para revisión antes de ejecución

5. **Patrón "Execution by Anyone"**
   - Cualquiera puede ejecutar propuestas aprobadas
   - Previene censura
   - El daemon es solo una conveniencia

## 📊 Estados de Propuesta

```
CREADA → ACTIVA → APROBADA/RECHAZADA → EJECUTADA

┌────────┐
│ CREADA │  (Al crearse)
└───┬────┘
    │
    ▼
┌────────┐
│ ACTIVA │  (Deadline no pasado)
└───┬────┘
    │
    │ Deadline pasa
    ▼
┌──────────────┐      ┌─────────────┐
│  APROBADA    │      │  RECHAZADA  │
│ (For > Against)│   │ (Against ≥ For)│
└───┬──────────┘      └─────────────┘
    │
    │ Deadline + DELAY pasa
    │ + Ejecución
    ▼
┌───────────┐
│ EJECUTADA │
└───────────┘
```

## 🎯 Decisiones de Diseño

### ¿Por qué EIP-2771?
- Permite votación sin gas para usuarios
- Mejora la experiencia de usuario
- Mantiene la descentralización (usuarios siguen firmando)

### ¿Por qué un daemon?
- Ejecución automática de propuestas aprobadas
- Conveniencia para usuarios
- No es necesario (cualquiera puede ejecutar)

### ¿Por qué "execution by anyone"?
- Previene censura
- Garantiza ejecución de propuestas aprobadas
- Patrón común en DeFi (Compound, Aave)

### ¿Por qué EXECUTION_DELAY?
- Período de seguridad adicional
- Permite revisión antes de ejecución
- Previene ejecuciones prematuras

## 📈 Optimizaciones de Gas

1. **Uso de eventos** para logging (más barato que storage)
2. **Packed structs** donde sea posible
3. **View functions** para consultas sin costo
4. **MinimalForwarder** implementación eficiente

## 🔮 Futuras Mejoras

- [ ] Soporte para múltiples tokens (ERC-20)
- [ ] Delegación de votos
- [ ] Quorum mínimo para aprobación
- [ ] Timelock para propuestas grandes
- [ ] Snapshot de balances para votación
- [ ] Interface para integraciones externas

---

**Última actualización**: 2025

