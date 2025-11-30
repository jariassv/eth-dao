# 🔐 Smart Contracts - DAO Voting System

Contratos inteligentes para el sistema de DAO con votación gasless, implementados en Solidity usando Foundry.

## 📋 Tabla de Contenidos

- [Descripción](#-descripción)
- [Contratos](#-contratos)
- [Arquitectura](#-arquitectura)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Seguridad](#-seguridad)
- [Gas Optimization](#-gas-optimization)

---

## 📖 Descripción

Este directorio contiene los contratos inteligentes que implementan el sistema de gobernanza DAO con las siguientes características:

- ✅ **Votación Democrática**: Sistema de propuestas con votación a favor/en contra/abstención
- 🔐 **Meta-Transacciones**: Soporte para votación gasless usando EIP-2771
- 💰 **Gestión de Fondos**: Depósito y retiro de ETH con seguimiento individual
- ⚡ **Ejecución Automática**: Propuestas ejecutables después de aprobación
- 🛡️ **Seguridad**: Validaciones exhaustivas y protección contra ataques comunes

---

## 📄 Contratos

### `MinimalForwarder.sol`

Implementación minimalista del estándar **EIP-2771** para meta-transacciones (gasless transactions).

**Responsabilidades**:
- Validación de firmas EIP-712
- Gestión de nonces por usuario
- Reenvío de transacciones firmadas
- Compatibilidad con ERC2771Context

**Funciones Principales**:
```solidity
function getNonce(address from) external view returns (uint256)
function verify(ForwardRequest calldata req, bytes calldata signature) public view returns (bool)
function execute(ForwardRequest calldata req, bytes calldata signature) external payable returns (bool, bytes memory)
```

**Características**:
- ✅ Validación de firmas criptográficas (ECDSA)
- ✅ Sistema de nonces para prevenir replay attacks
- ✅ Soporte para EIP-712 typed data signing
- ✅ Verificación de gas para evitar DoS

**Struct ForwardRequest**:
```solidity
struct ForwardRequest {
    address from;      // Usuario original
    address to;        // Contrato destino
    uint256 value;     // Valor ETH a enviar
    uint256 gas;       // Límite de gas
    uint256 nonce;     // Nonce del usuario
    bytes data;        // Calldata de la función
}
```

---

### `DAOVoting.sol`

Contrato principal que implementa la lógica del DAO.

**Responsabilidades**:
- Gestión de balances de usuarios
- Creación de propuestas
- Sistema de votación
- Ejecución de propuestas aprobadas
- Compatibilidad con meta-transacciones (ERC2771Context)

**Funciones Principales**:

#### Gestión de Fondos
```solidity
function fundDAO() external payable
function getUserBalance(address user) external view returns (uint256)
```

#### Propuestas
```solidity
function createProposal(
    address recipient,
    uint256 amount,
    uint256 deadline,
    string calldata description
) external

function getProposal(uint256 proposalId) external view returns (Proposal memory)
```

#### Votación
```solidity
function vote(uint256 proposalId, VoteType voteType) external
function hasVotedForProposal(uint256 proposalId, address user) external view returns (bool)
function getUserVote(uint256 proposalId, address user) external view returns (VoteType)
```

#### Ejecución
```solidity
function executeProposal(uint256 proposalId) external
```

**Enums y Structs**:

```solidity
enum VoteType {
    Against,  // 0
    For,      // 1
    Abstain   // 2
}

struct Proposal {
    uint256 id;              // ID único de la propuesta
    address recipient;       // Beneficiario de la transferencia
    uint256 amount;          // Monto en wei
    uint256 deadline;        // Timestamp del deadline
    string description;      // Descripción
    uint256 votesFor;        // Contador de votos a favor
    uint256 votesAgainst;    // Contador de votos en contra
    uint256 votesAbstain;    // Contador de abstenciones
    bool executed;           // Estado de ejecución
}
```

**Constantes de Configuración**:

- `CREATOR_PERCENT_BP = 1000` (10% en basis points)
  - Porcentaje mínimo del balance total requerido para crear propuestas
  
- `EXECUTION_DELAY = 1 hours`
  - Período de seguridad adicional después del deadline antes de poder ejecutar

**Reglas del DAO**:

1. **Crear Propuesta**: Requiere tener al menos 10% del balance total del DAO
2. **Votar**: Cualquier usuario puede votar, puede cambiar su voto antes del deadline
3. **Ejecutar**: Cualquiera puede ejecutar propuestas aprobadas después de deadline + delay
4. **Aprobación**: Una propuesta está aprobada si `votesFor > votesAgainst`

**Eventos**:

```solidity
event Funded(address indexed from, uint256 amount);
event ProposalCreated(uint256 indexed id, address indexed creator, address indexed recipient, uint256 amount, uint256 deadline);
event Voted(uint256 indexed id, address indexed voter, VoteType voteType);
event Executed(uint256 indexed id, address indexed recipient, uint256 amount);
```

---

## 🏗️ Arquitectura

### Flujo de Meta-Transacción

```
Usuario → Firma EIP-712 → Relayer → MinimalForwarder → DAOVoting
```

1. Usuario firma un `ForwardRequest` usando EIP-712
2. Relayer recibe la firma y la valida
3. Relayer llama a `MinimalForwarder.execute()`
4. Forwarder verifica firma y nonce
5. Forwarder llama a `DAOVoting.vote()` con el contexto del usuario original

### Herencia y Dependencias

```
DAOVoting
  └── ERC2771Context (OpenZeppelin)
        └── Context (OpenZeppelin)

MinimalForwarder
  └── Usa ECDSA (OpenZeppelin)
```

### Integración

- `DAOVoting` recibe la dirección del `MinimalForwarder` en el constructor
- Usa `ERC2771Context` para obtener el remitente real en meta-transacciones
- `_msgSender()` retorna el usuario original, no el relayer

---

## 📦 Instalación

### Prerrequisitos

- **Foundry** ([Instalación](https://book.getfoundry.sh/getting-started/installation))
  ```bash
  curl -L https://foundry.paradigm.xyz | bash
  foundryup
  ```

### Instalación de Dependencias

```bash
# Instalar dependencias de Foundry (OpenZeppelin, forge-std)
forge install

# Las dependencias se instalan en lib/
```

**Dependencias Principales**:
- `openzeppelin-contracts` - Biblioteca de contratos seguros
- `forge-std` - Biblioteca estándar de Foundry para testing

---

## ⚙️ Configuración

### `foundry.toml`

Configuración de Foundry en la raíz del directorio:

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
remappings = ["@openzeppelin/=lib/openzeppelin-contracts/contracts/"]
```

**Configuraciones Importantes**:
- `src`: Directorio de contratos fuente
- `out`: Directorio de compilación
- `libs`: Directorio de dependencias
- `remappings`: Mapeo de imports

### Configuración Avanzada

Puedes personalizar `foundry.toml` para:
- Optimizaciones de gas
- Versión de Solidity
- Configuración de compilador
- Límites de gas para tests

Ejemplo:
```toml
[profile.default]
solc = "0.8.20"
optimizer = true
optimizer_runs = 200
via_ir = false
```

---

## 🧪 Testing

### Ejecutar Tests

```bash
# Todos los tests
forge test

# Con verbosidad alta (útil para debugging)
forge test -vvv

# Tests de un contrato específico
forge test --match-contract DAOVoting
forge test --match-contract MinimalForwarder

# Test específico
forge test --match-test test_FundIncreasesBalances
```

### Estructura de Tests

```
sc/test/
├── MinimalForwarder.t.sol      # Tests del forwarder
├── DAOVoting.t.sol              # Tests básicos del DAO
└── DAOVotingGasless.t.sol       # Tests de votación gasless
```

### Cobertura de Tests

```bash
# Generar reporte de cobertura
forge coverage

# Reporte detallado
forge coverage --report lcov
```

### Gas Reports

```bash
# Reporte de gas
forge test --gas-report
```

### Tests Implementados

#### `MinimalForwarder.t.sol`
- ✅ Verificación de firmas EIP-712
- ✅ Ejecución de meta-transacciones
- ✅ Actualización de nonces
- ✅ Prevención de replay attacks
- ✅ Integración con contratos ERC2771

#### `DAOVoting.t.sol`
- ✅ Financiamiento del DAO
- ✅ Creación de propuestas (validación de 10%)
- ✅ Sistema de votación
- ✅ Cambio de votos antes del deadline
- ✅ Ejecución de propuestas
- ✅ Validación de deadlines
- ✅ Validación de balances

#### `DAOVotingGasless.t.sol`
- ✅ Votación mediante meta-transacciones
- ✅ Verificación de firmas off-chain
- ✅ Integración Forwarder → DAO
- ✅ Preservación del contexto del usuario

### Helpers de Testing

Los tests usan utilidades de Foundry:

```solidity
// Manipulación de tiempo
vm.warp(block.timestamp + 1 days);

// Impersonar cuentas
vm.prank(user);
dao.vote(1, DAOVoting.VoteType.For);

// Fondos para cuentas
vm.deal(user, 100 ether);

// Firmas
vm.sign(privateKey, hash);
```

---

## 🚀 Deployment

### Scripts de Deployment

```
sc/script/
├── Deploy.s.sol        # Deployment principal
└── Scenario.s.sol      # Escenarios de prueba
```

### Deploy Local (Anvil)

```bash
# Iniciar Anvil
anvil

# En otra terminal, desplegar
forge script script/Deploy.s.sol:Deploy \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### Deploy en Testnet/Mainnet

1. **Configurar variables de entorno**:
   ```bash
   export PRIVATE_KEY=your_private_key
   export RPC_URL=https://your-rpc-url
   ```

2. **Desplegar**:
   ```bash
   forge script script/Deploy.s.sol:Deploy \
     --rpc-url $RPC_URL \
     --broadcast \
     --private-key $PRIVATE_KEY
   ```

3. **Verificar contratos** (opcional):
   ```bash
   forge verify-contract \
     --chain-id 1 \
     --num-of-optimizations 200 \
     --watch \
     --constructor-args $(cast abi-encode "constructor(address)" $FORWARDER_ADDRESS) \
     $DAO_ADDRESS \
     DAOVoting
   ```

### Orden de Deployment

1. Desplegar `MinimalForwarder`
2. Desplegar `DAOVoting` con la dirección del forwarder

---

## 🔐 Seguridad

### Medidas de Seguridad Implementadas

1. **Validación de Firmas**
   - Uso de ECDSA para verificación criptográfica
   - EIP-712 para mensajes estructurados
   - Validación del remitente original

2. **Prevención de Replay Attacks**
   - Sistema de nonces único por usuario
   - Incremento automático después de cada ejecución
   - Verificación de nonce antes de ejecutar

3. **Validaciones de Estado**
   - Verificación de deadlines estricta
   - Validación de balances antes de operaciones
   - Verificación de permisos (10% para crear)

4. **Protección de Overflow/Underflow**
   - Solidity 0.8+ con overflow protection automático
   - Uso de SafeMath implícito

5. **Período de Seguridad**
   - EXECUTION_DELAY de 1 hora después del deadline
   - Permite revisión antes de ejecución

### Consideraciones de Seguridad

⚠️ **Antes de usar en producción**:
- Realizar auditoría profesional de seguridad
- Tests de fuzzing adicionales
- Revisión de código por pares
- Pruebas exhaustivas en testnets

### Patrones de Seguridad

- **Checks-Effects-Interactions**: Patrón seguido en todas las funciones
- **Reentrancy Guard**: No necesario debido a la estructura del código, pero considerarlo si se agregan funciones externas
- **Access Control**: Validación de permisos antes de operaciones críticas

---

## ⛽ Gas Optimization

### Optimizaciones Aplicadas

1. **Packing de Storage**
   - Variables pequeñas agrupadas en slots de 32 bytes
   - Uso eficiente de storage

2. **Eventos Indexados**
   - Eventos con parámetros indexados para reducir costo de logs

3. **Uso de Calldata**
   - Strings y arrays pasados como `calldata` en lugar de `memory`

4. **Reutilización de Variables**
   - Evitar lectura múltiple de storage

### Gas Report

Ejecuta para ver el consumo de gas:

```bash
forge test --gas-report
```

### Mejoras Futuras

- Considerar uso de `immutable` para constantes
- Optimizar loops si se agregan funcionalidades
- Considerar libraries para funciones comunes

---

## 📊 Funcionalidades Técnicas

### EIP-2771 Meta-Transactions

El sistema implementa votación gasless usando:
- **EIP-712**: Firma estructurada de mensajes
- **EIP-2771**: Trusted forwarder para meta-transacciones
- **ERC2771Context**: Contexto preservado del usuario original

### Manejo de Fondos

- Balance agregado del DAO: `totalDaoBalance`
- Balance individual por usuario: `userBalances[user]`
- Sincronización automática en depósitos y ejecuciones

### Sistema de Votación

- **Conteo**: Incremental por tipo de voto
- **Cambio de Voto**: Permitido antes del deadline
- **Abstenciones**: Contadas pero no afectan aprobación

---

## 🛠️ Comandos Útiles

### Compilación

```bash
# Compilar contratos
forge build

# Compilar con optimizaciones específicas
forge build --optimize --optimizer-runs 200
```

### Formateo

```bash
# Formatear código Solidity
forge fmt

# Verificar formato
forge fmt --check
```

### Análisis

```bash
# Sizes de contratos
forge build --sizes

# Generar interfaces
forge build --interface
```

### Interacción (Cast)

```bash
# Llamar función view
cast call $DAO_ADDRESS "getUserBalance(address)(uint256)" $USER_ADDRESS

# Enviar transacción
cast send $DAO_ADDRESS "fundDAO()" --value 1ether --private-key $PK
```

---

## 📚 Recursos

### Documentación

- [Foundry Book](https://book.getfoundry.sh/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

### Estándares EIP

- [EIP-2771](https://eips.ethereum.org/EIPS/eip-2771) - Secure Protocol for Native Meta Transactions
- [EIP-712](https://eips.ethereum.org/EIPS/eip-712) - Ethereum typed structured data hashing and signing

### Herramientas

- [Foundry](https://github.com/foundry-rs/foundry) - Toolkit de desarrollo Ethereum
- [Hardhat](https://hardhat.org/) - Alternativa a Foundry
- [Remix](https://remix.ethereum.org/) - IDE en línea para Solidity

---

## 📝 Notas

### Versionado

- **Solidity**: ^0.8.20
- **OpenZeppelin**: Última versión compatible

### Compatibilidad

- **EVM**: Compatible con todas las redes EVM
- **Meta-Transactions**: Requiere EIP-2771 compatible forwarder

---

## 📄 Licencia

MIT

---

**¡Desarrollado con ❤️ usando Foundry!**
