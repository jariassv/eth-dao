# 🌐 Frontend - DAO Voting Application

Frontend moderno y profesional para la aplicación DAO con votación gasless, construido con Next.js 15, TypeScript y Tailwind CSS.

## 📋 Tabla de Contenidos

- [Descripción](#-descripción)
- [Tecnologías](#-tecnologías)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Configuración](#-configuración)
- [Desarrollo](#-desarrollo)
- [Componentes](#-componentes)
- [Hooks Personalizados](#-hooks-personalizados)
- [API Routes](#-api-routes)
- [Build y Deploy](#-build-y-deploy)

---

## 📖 Descripción

Este frontend proporciona una interfaz de usuario completa para interactuar con el contrato inteligente DAO. Permite a los usuarios:

- ✅ Conectarse con MetaMask
- 💰 Financiar el DAO con ETH
- 📝 Crear nuevas propuestas
- 🗳️ Votar propuestas (normal o gasless)
- ⚡ Ejecutar propuestas aprobadas
- 📊 Visualizar todas las propuestas y su estado

### Características Principales

- **UI/UX Moderna**: Interfaz limpia y profesional con Tailwind CSS
- **TypeScript**: Tipado estático para mayor seguridad y productividad
- **Next.js 15**: Framework React con App Router y Server Components
- **MetaMask Integration**: Conexión completa con MetaMask
- **Gasless Voting**: Soporte para votación sin pagar gas
- **Tiempo Real**: Actualización automática de estados
- **Responsive Design**: Funciona en desktop y mobile

---

## 🛠️ Tecnologías

### Framework y Lenguaje

- **Next.js 16.0.1** - Framework React con App Router
- **React 19.2.0** - Biblioteca UI
- **TypeScript 5** - Tipado estático

### Estilos

- **Tailwind CSS 4** - Framework de utilidades CSS
- **PostCSS** - Procesador de CSS

### Blockchain

- **Ethers.js v6.15.0** - Interacción con Ethereum
- **MetaMask** - Wallet integration

### Desarrollo

- **ESLint** - Linter de código
- **TypeScript** - Verificación de tipos

---

## 📁 Estructura del Proyecto

```
web/
├── src/
│   ├── app/                          # App Router de Next.js
│   │   ├── api/                      # API Routes (Server)
│   │   │   ├── relay/                # Endpoint para relayer gasless
│   │   │   └── daemon/               # Endpoint para daemon de ejecución
│   │   ├── page.tsx                  # Página principal
│   │   ├── layout.tsx                # Layout raíz
│   │   ├── globals.css               # Estilos globales
│   │   └── favicon.ico               # Favicon
│   │
│   ├── components/                   # Componentes React
│   │   ├── Header.tsx                # Encabezado de la aplicación
│   │   ├── Sidebar.tsx               # Barra lateral de navegación
│   │   ├── ConnectWallet.tsx         # Componente de conexión de wallet
│   │   ├── FundingPanel.tsx          # Panel para financiar el DAO
│   │   ├── CreateProposal.tsx        # Formulario de creación de propuestas
│   │   ├── ProposalList.tsx          # Lista de todas las propuestas
│   │   ├── ProposalCard.tsx          # Tarjeta individual de propuesta
│   │   ├── VoteButtons.tsx           # Botones de votación (For/Against/Abstain)
│   │   └── ExecuteProposalButton.tsx # Botón para ejecutar propuestas
│   │
│   ├── hooks/                        # Custom React Hooks
│   │   ├── useWallet.ts              # Hook para manejo de wallet y conexión
│   │   ├── useCountdown.ts           # Hook para countdown timers
│   │   └── useDaemon.ts              # Hook para interacción con daemon
│   │
│   └── lib/                          # Utilidades y helpers
│       ├── contracts.ts              # ABI de contratos y direcciones
│       ├── ethereum.ts               # Utilidades de Ethereum
│       ├── forwarder.ts              # Lógica de meta-transacciones EIP-2771
│       └── errorHandler.ts           # Manejo y parseo de errores
│
├── public/                           # Archivos estáticos
├── package.json                      # Dependencias
├── next.config.ts                    # Configuración de Next.js
├── tsconfig.json                     # Configuración de TypeScript
├── eslint.config.mjs                 # Configuración de ESLint
├── postcss.config.mjs                # Configuración de PostCSS
└── README.md                         # Este archivo
```

---

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env.local` en la raíz del directorio `web/`:

```env
# Direcciones de contratos (requeridas)
NEXT_PUBLIC_DAO_ADDRESS=0x...
NEXT_PUBLIC_FORWARDER_ADDRESS=0x...

# Configuración de red (requeridas)
NEXT_PUBLIC_CHAIN_ID=31337
RPC_URL=http://127.0.0.1:8545

# Configuración del relayer (requeridas para votación gasless)
RELAYER_PRIVATE_KEY=0x...
RELAYER_ADDRESS=0x...
```

> **Nota**: El script `start-dev.sh` en la raíz del proyecto configura automáticamente estas variables.

### Instalación de Dependencias

```bash
npm install
```

---

## 🚀 Desarrollo

### Iniciar Servidor de Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

### Linting

```bash
npm run lint
```

### Verificación de Tipos

```bash
npx tsc --noEmit
```

---

## 🧩 Componentes

### Componentes Principales

#### `Header.tsx`
Encabezado de la aplicación que muestra:
- Logo/nombre del DAO
- Estado de conexión de la wallet
- Botón de conexión/desconexión

#### `Sidebar.tsx`
Barra lateral de navegación con pestañas:
- Financiar DAO
- Crear Propuesta
- Propuestas
- Estado del DAO

#### `ConnectWallet.tsx`
Componente para conectar/desconectar MetaMask:
- Detecta si MetaMask está instalado
- Muestra estado de conexión
- Maneja cambio de cuentas/redes

#### `FundingPanel.tsx`
Panel para depositar ETH en el DAO:
- Input para cantidad de ETH
- Muestra balance actual del usuario
- Botón para enviar transacción

#### `CreateProposal.tsx`
Formulario para crear nuevas propuestas:
- Input para dirección beneficiaria
- Input para monto en ETH
- Input para deadline en horas
- Textarea para descripción
- Validaciones de formulario

#### `ProposalList.tsx`
Lista de todas las propuestas:
- Filtrado por estado (Activa, Aprobada, Rechazada, Ejecutada)
- Ordenamiento por fecha
- Integración con `ProposalCard`

#### `ProposalCard.tsx`
Tarjeta individual mostrando detalles de propuesta:
- Información de la propuesta
- Contador de votos
- Estado actual
- Botones de votación (si está activa)
- Botón de ejecución (si está aprobada)

#### `VoteButtons.tsx`
Botones para votar en propuestas:
- Botón "A FAVOR"
- Botón "EN CONTRA"
- Botón "ABSTENCIÓN"
- Checkbox para votación gasless

#### `ExecuteProposalButton.tsx`
Botón para ejecutar propuestas aprobadas:
- Valida condiciones de ejecución
- Muestra estado de disponibilidad
- Maneja transacción de ejecución

---

## 🎣 Hooks Personalizados

### `useWallet.ts`

Hook principal para manejo de wallet:

```typescript
const { address, isConnected, connect, disconnect, provider, signer } = useWallet();
```

**Funcionalidades**:
- Detecta MetaMask
- Maneja conexión/desconexión
- Detecta cambio de cuentas
- Detecta cambio de red
- Proporciona provider y signer

### `useCountdown.ts`

Hook para countdown timers:

```typescript
const { timeLeft, isExpired } = useCountdown(targetTimestamp);
```

**Uso**: Para mostrar tiempo restante hasta deadline de propuestas.

### `useDaemon.ts`

Hook para interacción con el daemon:

```typescript
const { checkAndExecute } = useDaemon();
```

**Uso**: Para verificar y ejecutar propuestas automáticamente.

---

## 🔌 API Routes

### `/api/relay`

Endpoint para procesar meta-transacciones (votación gasless).

**Método**: `POST`

**Body**:
```json
{
  "request": {
    "from": "0x...",
    "to": "0x...",
    "value": "0",
    "gas": "100000",
    "nonce": "0",
    "data": "0x..."
  },
  "signature": "0x..."
}
```

**Funcionalidad**:
1. Valida la firma EIP-712
2. Verifica el nonce
3. Ejecuta la transacción en nombre del usuario
4. Retorna el resultado

### `/api/daemon`

Endpoint para ejecución automática de propuestas.

**Método**: `GET`

**Funcionalidad**:
1. Obtiene todas las propuestas
2. Filtra propuestas elegibles (deadline pasado + período de seguridad)
3. Ejecuta propuestas aprobadas
4. Retorna resumen de ejecuciones

> **Nota**: Este endpoint puede ser llamado periódicamente por un cron job.

---

## 🏗️ Build y Deploy

### Build de Producción

```bash
npm run build
```

Esto generará una build optimizada en el directorio `.next/`.

### Ejecutar Build de Producción

```bash
npm start
```

### Variables de Entorno para Producción

Asegúrate de configurar todas las variables de entorno necesarias en tu plataforma de deployment:

- Vercel: Configurar en "Environment Variables"
- Netlify: Configurar en "Site settings > Build & deploy > Environment"
- Otros: Según la documentación de la plataforma

### Deploy en Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel
```

O conectar el repositorio directamente en [Vercel](https://vercel.com).

---

## 🔧 Configuración Avanzada

### Personalizar Estilos

Los estilos están en `src/app/globals.css` usando Tailwind CSS. Puedes personalizar:

- Colores del tema
- Fuentes
- Espaciados
- Breakpoints responsive

### Configurar MetaMask

Asegúrate de que los usuarios tengan configurada la red correcta:

- **Local Development**: Chain ID 31337
- **Testnet**: Configurar según la testnet usada
- **Mainnet**: Chain ID 1 (Ethereum)

### Optimizaciones

- **Imágenes**: Usar `next/image` para optimización automática
- **Código Splitting**: Next.js lo hace automáticamente
- **Caching**: Configurar headers de cache según necesidad

---

## 🐛 Solución de Problemas

### MetaMask no se conecta

1. Verifica que MetaMask esté instalado
2. Verifica que estés en la red correcta (Chain ID)
3. Revisa la consola del navegador para errores
4. Prueba recargar la página

### Errores de transacción

1. Verifica que tengas suficientes fondos
2. Verifica que el contrato esté desplegado
3. Revisa las direcciones en `.env.local`
4. Verifica los logs de Anvil (si estás en local)

### Votación gasless falla

1. Verifica `RELAYER_PRIVATE_KEY` en `.env.local`
2. Verifica que el relayer tenga fondos
3. Revisa los logs del endpoint `/api/relay`
4. Verifica el nonce del usuario

---

## 📚 Recursos

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [Ethers.js v6 Documentation](https://docs.ethers.org/v6/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

---

## 📄 Licencia

Este proyecto es parte de un curso educativo.

---

**¡Desarrollado con ❤️ usando Next.js y TypeScript!**
