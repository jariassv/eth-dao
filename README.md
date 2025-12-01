# 🏛️ DAO con Votación Gasless

Una aplicación completa de **DAO (Decentralized Autonomous Organization)** que permite a los usuarios votar propuestas **sin pagar gas**, utilizando meta-transacciones EIP-2771. Este proyecto demuestra un sistema de gobernanza descentralizado moderno con capacidades de votación gasless y ejecución automática de propuestas.

---

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
- [Seguridad](#-seguridad)
- [Solución de Problemas](#-solución-de-problemas)
- [Contribuir](#-contribuir)

---

## ✨ Características

### 🎯 Funcionalidades Principales

- ✅ **Votación Gasless**: Vota propuestas sin pagar gas usando meta-transacciones (EIP-2771)
- 🗳️ **Sistema de Propuestas**: Crea, vota y ejecuta propuestas de transferencia de fondos
- 💰 **Gestión de Fondos**: Depósito y retiro de ETH al DAO con seguimiento individual
- 🔐 **Seguridad Avanzada**: Validación de firmas off-chain con nonces para prevenir replay attacks
- ⚡ **Ejecución Automática**: Daemon que ejecuta automáticamente propuestas aprobadas
- 🎨 **UI Moderna**: Interfaz web profesional con Next.js 15 y Tailwind CSS
- 🔄 **Cambio de Votos**: Los usuarios pueden cambiar su voto antes del deadline
- 📊 **Transparencia Total**: Visualización completa de todas las propuestas y votos

### 🛡️ Características de Seguridad

- Validación de firmas ECDSA
- Sistema de nonces único por usuario
- Verificación de deadlines estricta
- Validación de balances antes de operaciones
- Protección contra replay attacks
- Período de seguridad adicional (1 hora) después del deadline
- Patrón "execution by anyone" para prevenir censura

---

## 🛠️ Tecnologías

### Smart Contracts

- **Solidity** ^0.8.20 - Lenguaje de programación para contratos inteligentes
- **Foundry** - Suite de herramientas para desarrollo Ethereum (Forge, Cast, Anvil)
- **OpenZeppelin Contracts** - Biblioteca de contratos seguros y auditados (ERC2771Context)

### Frontend

- **Next.js 15** - Framework React con App Router y Server Components
- **TypeScript** - Tipado estático para JavaScript
- **Tailwind CSS** - Framework de utilidades CSS para diseño rápido
- **Ethers.js v6** - Biblioteca para interactuar con Ethereum
- **MetaMask** - Wallet integrada para conexión y transacciones

### Infraestructura

- **Anvil** - Red local de Ethereum para desarrollo y testing
- **EIP-2771** - Estándar para meta-transacciones (gasless)
- **EIP-712** - Estándar para firma de mensajes estructurados

### Desarrollo

- **Git** - Control de versiones
- **Bash** - Scripts de automatización

---

## 🏗️ Arquitectura

### Diagrama de Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Next.js 15 Application                              │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │  │
│  │  │  Components  │  │    Hooks     │  │   Lib    │  │  │
│  │  │  - Header    │  │  - useWallet │  │ contracts│  │  │
│  │  │  - Sidebar   │  │  - useCount  │  │ forwarder│  │  │
│  │  │  - Proposal* │  │    down      │  │ ethereum │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                │ HTTP/WebSocket
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                      API LAYER                              │
│  ┌────────────────────────┐  ┌────────────────────────┐    │
│  │   /api/relay           │  │   /api/daemon          │    │
│  │   (Meta-transactions)  │  │   (Auto-execution)     │    │
│  └────────────────────────┘  └────────────────────────┘    │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                │ JSON-RPC
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                   BLOCKCHAIN LAYER                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Anvil (Local Ethereum Node)                         │  │
│  │  - Chain ID: 31337                                   │  │
│  │  - RPC: http://127.0.0.1:8545                        │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│  ┌───────────────────────────▼───────────────────────────┐  │
│  │  Smart Contracts                                      │  │
│  │  ┌──────────────────┐  ┌──────────────────┐          │  │
│  │  │ MinimalForwarder │──▶│   DAOVoting      │          │  │
│  │  │ (EIP-2771)       │  │ (ERC2771Context) │          │  │
│  │  └──────────────────┘  └──────────────────┘          │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
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

Para más detalles técnicos sobre la arquitectura, consulta [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 📦 Instalación

### Prerrequisitos

Asegúrate de tener instalado:

- **Node.js** >= 18.x ([Descargar](https://nodejs.org/))
- **Foundry** ([Instalación](https://book.getfoundry.sh/getting-started/installation))
  ```bash
  curl -L https://foundry.paradigm.xyz | bash
  foundryup
  ```
- **MetaMask** - Extensión de navegador ([Instalar](https://metamask.io/download/))
- **Git** - Para clonar el repositorio

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

4. **Verificar instalación**
   ```bash
   # Verificar Foundry
   forge --version
   
   # Verificar Node.js
   node --version
   
   # Verificar npm
   npm --version
   ```

---

## ⚙️ Configuración

### Variables de Entorno

El proyecto incluye un script automatizado (`start-dev.sh`) que configura todo automáticamente. Si prefieres hacerlo manualmente:

1. **Crear archivo `.env.local` en `web/`**:
   ```env
   # Direcciones de contratos (se generan al desplegar)
   NEXT_PUBLIC_DAO_ADDRESS=0x...
   NEXT_PUBLIC_FORWARDER_ADDRESS=0x...
   
   # Configuración de red
   NEXT_PUBLIC_CHAIN_ID=31337
   RPC_URL=http://127.0.0.1:8545
   
   # Configuración del relayer (para votación gasless)
   RELAYER_PRIVATE_KEY=0x...
   RELAYER_ADDRESS=0x...
   ```

   > **Nota**: Las direcciones de los contratos se actualizan automáticamente cuando usas `start-dev.sh`.

### Configurar MetaMask

Para interactuar con la aplicación en desarrollo local:

1. **Añadir red local a MetaMask**:
   - Abre MetaMask → Configuración → Redes → Añadir Red
   - **Nombre**: Anvil Local
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Símbolo de moneda**: ETH

2. **Importar cuenta de desarrollo (opcional)**:
   - MetaMask → Importar cuenta → Clave privada
   - **Private Key**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - Esta cuenta tiene fondos ilimitados en Anvil para testing

---

## 🚀 Uso

### Opción 1: Script Automatizado (Recomendado)

El script `start-dev.sh` automatiza todo el proceso:

```bash
./start-dev.sh
```

Este script realiza automáticamente:
- ✅ Verifica si Anvil está corriendo, si no lo inicia
- ✅ Despliega los contratos inteligentes
- ✅ Actualiza `.env.local` con las direcciones de los contratos
- ✅ Inicia el servidor de desarrollo de Next.js

### Opción 2: Proceso Manual

Si prefieres controlar cada paso:

1. **Iniciar Anvil** (en una terminal):
   ```bash
   anvil
   ```
   O en background:
   ```bash
   anvil > /tmp/anvil.log 2>&1 &
   ```

2. **Desplegar Contratos** (en otra terminal):
   ```bash
   cd sc
   forge script script/Deploy.s.sol:Deploy --rpc-url http://127.0.0.1:8545 --broadcast
   ```

3. **Configurar Variables de Entorno**:
   - Copia las direcciones de los contratos desplegados
   - Actualiza `web/.env.local` con las direcciones

4. **Iniciar Frontend**:
   ```bash
   cd web
   npm run dev
   ```

### Acceder a la Aplicación

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🎥 Demo

Puedes ver una demostración completa del funcionamiento del DAO en el siguiente video:

📹 **[Demo DAO](./Demo%20DAO.mp4)** - Demostración completa del sistema de votación gasless y gestión de propuestas

---

## 📖 Guía de Uso Completa

### 1. Financiar el DAO

Para participar en el DAO, primero necesitas depositar fondos:

1. Conecta tu wallet (MetaMask)
2. Ve a la pestaña **"Financiar DAO"**
3. Ingresa la cantidad de ETH a depositar
4. Click en **"Financiar"**
5. Confirma la transacción en MetaMask

**Reglas importantes**:
- Necesitas tener al menos el **10% del balance total** para crear propuestas
- Los fondos depositados se registran en tu balance personal
- El balance total del DAO se actualiza automáticamente

### 2. Crear una Propuesta

Solo usuarios con suficiente participación pueden crear propuestas:

1. Ve a la pestaña **"Crear Propuesta"**
2. Completa el formulario:
   - **Beneficiario**: Dirección Ethereum del receptor (0x...)
   - **Monto**: Cantidad de ETH a transferir
   - **Deadline**: Horas hasta el cierre de votación (mínimo 1 hora)
   - **Descripción**: Descripción detallada de la propuesta
3. Click en **"Crear Propuesta"**
4. Confirma la transacción en MetaMask

**Notas**:
- El deadline debe ser futuro (mayor al tiempo actual)
- Solo se pueden crear propuestas de transferencia de fondos
- Cada propuesta recibe un ID único automáticamente

### 3. Votar una Propuesta

Los usuarios pueden votar en cualquier propuesta activa:

1. Ve a la pestaña **"Propuestas"**
2. Selecciona una propuesta activa (antes del deadline)
3. Elige tu voto:
   - ✅ **A FAVOR**: Apoya la propuesta
   - ❌ **EN CONTRA**: Rechaza la propuesta
   - ⚪ **ABSTENCIÓN**: No toma posición
4. Selecciona el método de votación:
   - **☑️ Gasless (relayer paga)**: Marca el checkbox para votar sin pagar gas
   - **☐ Normal (yo pago gas)**: Desmarca para pagar el gas tú mismo
5. Confirma la firma (o transacción si pagas gas)

**Características**:
- Puedes cambiar tu voto antes del deadline
- Los votos se registran individualmente
- El conteo de votos se actualiza en tiempo real

### 4. Ejecutar Propuesta

Las propuestas aprobadas se ejecutan automáticamente, pero también puedes ejecutarlas manualmente:

**Ejecución Automática**:
- El daemon (`/api/daemon`) verifica periódicamente propuestas listas
- Se ejecutan automáticamente después de `deadline + 1 hora`
- Solo propuestas aprobadas (votos a favor > votos en contra)

**Ejecución Manual**:
1. Ve a la pestaña **"Propuestas"**
2. Busca propuestas con estado **"Aprobada"** y **"Lista para ejecutar"**
3. Click en **"🚀 Ejecutar Propuesta"**
4. Confirma la transacción

**Notas**:
- Cualquiera puede ejecutar propuestas aprobadas (patrón anti-censura)
- La propuesta debe haber pasado el deadline + 1 hora de seguridad
- Solo se puede ejecutar una vez

---

## 📁 Estructura del Proyecto

```
02-DAO/
├── sc/                              # Smart Contracts (Foundry)
│   ├── src/
│   │   ├── MinimalForwarder.sol     # Contrato EIP-2771 para meta-transacciones
│   │   ├── DAOVoting.sol            # Contrato principal del DAO
│   │   └── mocks/
│   │       └── Recipient.sol        # Contrato mock para testing
│   ├── test/                        # Tests de Foundry
│   │   ├── MinimalForwarder.t.sol   # Tests del forwarder
│   │   ├── DAOVoting.t.sol          # Tests básicos del DAO
│   │   └── DAOVotingGasless.t.sol   # Tests de votación gasless
│   ├── script/                      # Scripts de deployment
│   │   ├── Deploy.s.sol             # Script de deployment principal
│   │   └── Scenario.s.sol           # Script de escenarios de prueba
│   ├── lib/                         # Dependencias de Foundry
│   │   ├── forge-std/               # Biblioteca estándar de Foundry
│   │   └── openzeppelin-contracts/  # Contratos de OpenZeppelin
│   ├── foundry.toml                 # Configuración de Foundry
│   └── README.md                    # Documentación de smart contracts
│
├── web/                             # Frontend (Next.js)
│   ├── src/
│   │   ├── app/                     # App Router de Next.js
│   │   │   ├── api/                 # API Routes
│   │   │   │   ├── relay/           # Relayer para votación gasless
│   │   │   │   └── daemon/          # Daemon de ejecución automática
│   │   │   ├── page.tsx             # Página principal
│   │   │   ├── layout.tsx           # Layout principal
│   │   │   └── globals.css          # Estilos globales
│   │   ├── components/              # Componentes React
│   │   │   ├── Header.tsx           # Encabezado de la aplicación
│   │   │   ├── Sidebar.tsx          # Barra lateral de navegación
│   │   │   ├── ConnectWallet.tsx    # Componente de conexión de wallet
│   │   │   ├── FundingPanel.tsx     # Panel de financiamiento
│   │   │   ├── CreateProposal.tsx   # Formulario de creación de propuestas
│   │   │   ├── ProposalList.tsx     # Lista de propuestas
│   │   │   ├── ProposalCard.tsx     # Tarjeta individual de propuesta
│   │   │   ├── VoteButtons.tsx      # Botones de votación
│   │   │   └── ExecuteProposalButton.tsx # Botón de ejecución
│   │   ├── hooks/                   # Custom hooks
│   │   │   ├── useWallet.ts         # Hook para manejo de wallet
│   │   │   ├── useCountdown.ts      # Hook para countdown timers
│   │   │   └── useDaemon.ts         # Hook para daemon
│   │   └── lib/                     # Utilidades y helpers
│   │       ├── contracts.ts         # ABI y direcciones de contratos
│   │       ├── ethereum.ts          # Utilidades de Ethereum
│   │       ├── forwarder.ts         # Lógica de meta-transacciones
│   │       └── errorHandler.ts      # Manejo de errores
│   ├── public/                      # Archivos estáticos
│   ├── package.json                 # Dependencias del frontend
│   ├── next.config.ts               # Configuración de Next.js
│   ├── tsconfig.json                # Configuración de TypeScript
│   └── README.md                    # Documentación del frontend
│
├── start-dev.sh                     # Script de desarrollo automatizado
├── advance-time.sh                  # Script para adelantar tiempo en Anvil
├── ARCHITECTURE.md                  # Documentación técnica detallada
└── README.md                        # Este archivo
```

---

## 🧪 Testing

### Tests de Smart Contracts

Los tests están escritos en Solidity usando Foundry:

```bash
cd sc

# Ejecutar todos los tests
forge test

# Ejecutar tests con gas report
forge test --gas-report

# Ejecutar tests con coverage
forge coverage

# Ejecutar tests con verbosidad alta
forge test -vvv
```

### Tests Específicos

```bash
# Tests de MinimalForwarder
forge test --match-contract MinimalForwarder

# Tests de DAOVoting (funcionalidad básica)
forge test --match-contract DAOVoting

# Tests de votación gasless
forge test --match-contract DAOVotingGasless

# Ejecutar un test específico
forge test --match-test test_FundIncreasesBalances
```

### Cobertura de Tests

Para ver la cobertura completa:

```bash
cd sc
forge coverage --report lcov
```

Los tests cubren:
- ✅ Funcionalidad básica del DAO (fund, create, vote, execute)
- ✅ Validaciones de seguridad
- ✅ Meta-transacciones (gasless)
- ✅ Manejo de errores
- ✅ Edge cases

---

## 🛠️ Scripts Útiles

### Scripts de Desarrollo

- **`start-dev.sh`**: Inicia todo el entorno de desarrollo
  - Verifica/inicia Anvil
  - Despliega contratos
  - Configura variables de entorno
  - Inicia Next.js

- **`advance-time.sh [segundos]`**: Adelanta el tiempo en Anvil
  ```bash
  # Adelantar 24 horas (útil para probar deadlines)
  ./advance-time.sh 86400
  
  # Adelantar 1 hora
  ./advance-time.sh 3600
  ```

### Scripts de Foundry

```bash
cd sc

# Compilar contratos
forge build

# Formatear código Solidity
forge fmt

# Generar gas snapshots
forge snapshot

# Desplegar en red local
forge script script/Deploy.s.sol:Deploy --rpc-url http://127.0.0.1:8545 --broadcast

# Verificar contratos (si están desplegados en red pública)
forge verify-contract <CONTRACT_ADDRESS> <CONTRACT_NAME> --chain-id <CHAIN_ID>
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

# Verificar tipos TypeScript
npx tsc --noEmit
```

---

## 🔍 Funcionalidades Técnicas

### Meta-Transacciones (EIP-2771)

El sistema implementa votación gasless usando el estándar EIP-2771:

- **Firma Off-chain**: Los usuarios firman mensajes con EIP-712 (no transacciones)
- **Validación**: El relayer valida firmas antes de ejecutar
- **Nonces**: Sistema de nonces único por usuario previene replay attacks
- **Gasless**: El relayer paga el gas por el usuario
- **Trusted Forwarder**: MinimalForwarder valida y reenvía llamadas

### Seguridad

Múltiples capas de seguridad:

- ✅ **Validación de Firmas ECDSA**: Verificación criptográfica de todas las meta-transacciones
- ✅ **Nonces Únicos**: Cada usuario tiene un nonce que se incrementa automáticamente
- ✅ **Verificación de Deadlines**: Validación estricta de tiempos
- ✅ **Validación de Balances**: Verificación antes de operaciones críticas
- ✅ **Protección Replay**: Nonces previenen reutilización de firmas
- ✅ **Período de Seguridad**: 1 hora adicional después del deadline para revisión
- ✅ **Execution by Anyone**: Patrón anti-censura, cualquiera puede ejecutar propuestas aprobadas

### Daemon de Ejecución

El daemon (`/api/daemon`) verifica y ejecuta automáticamente propuestas que:

- ✅ Hayan pasado el deadline
- ✅ Hayan pasado el período de seguridad (deadline + 1 hora)
- ✅ Tengan más votos a favor que en contra
- ✅ No hayan sido ejecutadas ya
- ✅ Tengan fondos suficientes en el DAO

El daemon puede ser llamado periódicamente usando un cron job o servicio de scheduling.

---

## 🔐 Seguridad

### Medidas de Seguridad Implementadas

1. **Validación Criptográfica**
   - Firmas ECDSA verificadas en cada meta-transacción
   - Uso de EIP-712 para mensajes estructurados
   - Validación de direcciones del remitente

2. **Prevención de Ataques**
   - Nonces para prevenir replay attacks
   - Validación de deadlines estricta
   - Verificación de balances antes de transacciones
   - Protección contra overflow/underflow (Solidity 0.8+)

3. **Transparencia**
   - Todos los eventos son públicos y verificables
   - Estado del contrato completamente auditable
   - Sin funciones admin ocultas

### Auditoría de Código

Antes de usar en producción, se recomienda:
- Auditoría profesional de seguridad
- Tests de fuzzing adicionales
- Revisión de código por pares
- Pruebas en testnets públicas

---

## 📝 Notas Importantes

### Reglas del DAO

1. **Balance para Crear Propuestas**: Solo usuarios con ≥10% del balance total pueden crear propuestas
2. **Deadline**: El deadline marca el fin de la votación (no se pueden votar después)
3. **Ejecución**: Las propuestas se pueden ejecutar después de `deadline + 1 hora` (período de seguridad)
4. **Ejecución por Cualquiera**: En el contrato, cualquiera puede ejecutar propuestas aprobadas (patrón "execution by anyone")
5. **Votación Gasless**: Requiere que el relayer tenga fondos para pagar el gas
6. **Cambio de Votos**: Los usuarios pueden cambiar su voto antes del deadline

### Límites y Consideraciones

- El DAO maneja solo ETH (no tokens ERC-20)
- Las propuestas solo pueden transferir ETH (no llamadas arbitrarias)
- No hay límite en el número de propuestas
- No hay límite en el monto de una propuesta (solo el balance disponible)

---

## 🐛 Solución de Problemas

### Anvil no inicia

```bash
# Verificar si el puerto está ocupado
lsof -i :8545

# Matar proceso si es necesario
kill $(lsof -ti:8545)

# Intentar iniciar Anvil manualmente para ver errores
anvil
```

### Contratos no se despliegan

- Verifica que Anvil esté corriendo: `curl http://127.0.0.1:8545`
- Revisa las claves privadas en `.env.local`
- Verifica los logs de Anvil: `tail -f /tmp/anvil.log`
- Asegúrate de tener fondos en la cuenta desplegadora

### Frontend no se conecta

- Verifica que MetaMask esté configurada con la red local (Chain ID 31337)
- Revisa las variables de entorno en `.env.local`
- Verifica los logs de Next.js: `tail -f /tmp/nextjs.log`
- Asegúrate de que las direcciones de los contratos sean correctas

### Votación Gasless falla

- Verifica que `RELAYER_PRIVATE_KEY` esté configurada en `.env.local`
- Asegúrate que la cuenta del relayer tenga fondos (ETH para gas)
- Revisa los logs del relayer en la consola del navegador
- Verifica que el nonce esté correcto

### Error "INSUFFICIENT_SHARE"

- Necesitas tener al menos el 10% del balance total del DAO
- Deposita más fondos o espera a que otros usuarios depositen (baja el % requerido)

### Propuestas no se ejecutan automáticamente

- Verifica que el daemon esté configurado y corriendo
- Asegúrate de que haya pasado el deadline + 1 hora
- Verifica que la propuesta esté aprobada (votosFor > votosAgainst)
- Puedes ejecutarla manualmente desde la UI

---

## 📚 Recursos Adicionales

### Documentación Oficial

- [Foundry Book](https://book.getfoundry.sh/) - Documentación completa de Foundry
- [Next.js Documentation](https://nextjs.org/docs) - Documentación de Next.js
- [Ethers.js Documentation](https://docs.ethers.org/) - Documentación de Ethers.js
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/) - Documentación de OpenZeppelin

### Estándares EIP

- [EIP-2771](https://eips.ethereum.org/EIPS/eip-2771) - Secure Protocol for Native Meta Transactions
- [EIP-712](https://eips.ethereum.org/EIPS/eip-712) - Ethereum typed structured data hashing and signing

### Tutoriales y Guías

- [Foundry Tutorial](https://book.getfoundry.sh/getting-started/first-steps)
- [Next.js Learn](https://nextjs.org/learn) - Tutorial interactivo de Next.js
- [Meta Transactions Guide](https://docs.openzeppelin.com/contracts/metatx) - Guía de meta-transacciones

---

## 🤝 Contribuir

Este proyecto es parte de un curso educativo. Si deseas contribuir:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Guías de Contribución

- Mantén el código limpio y comentado
- Agrega tests para nuevas funcionalidades
- Sigue las convenciones de código existentes
- Actualiza la documentación si es necesario

---

## 📄 Licencia

Este proyecto es parte de un curso educativo.

---

## 👨‍💻 Autor

Desarrollado como parte de un curso de desarrollo de aplicaciones descentralizadas en Ethereum.

---

**¡Desarrollado con ❤️ usando Foundry y Next.js!**

Para más información técnica detallada, consulta [ARCHITECTURE.md](./ARCHITECTURE.md).
