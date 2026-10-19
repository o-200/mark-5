# Mark-5: DDD Discord Bot Skeleton

An enterprise-grade, strictly-typed Discord bot skeleton built with **Node.js (LTS)**, **TypeScript**, **discord.js v14+**, **Zod**, native **fetch**, and **Pino**.

The project is structured according to **Domain-Driven Design (DDD)** and **Hexagonal (Ports and Adapters)** architecture principles, positioning the bot as a robust, resilient intermediary layer between Discord API interactions and backend REST/HTTP endpoints.

---

### Layer Breakdown

1. **`src/domain` (Core Business Logic)**
   - Pure TypeScript, zero external framework dependencies.
   - **Entities**: Business objects with lifecycle and identity (`UserProfile`).
   - **Value Objects**: Validated, immutable attributes (`DiscordId` snowflake validation, `Email`).
   - **Ports**: Interface contracts for external systems (`IBackendUserGateway`).
   - **Errors**: Domain-specific error types (`InvalidBioError`).

2. **`src/application` (Use Cases & Orchestration)**
   - Implements application workflows (`GetUserProfileUseCase`, `UpdateUserProfileUseCase`).
   - Validates input boundaries with Zod schemas (`GetUserProfileInputSchema`, `UpdateUserProfileInputSchema`).
   - Maps domain entities to/from DTOs (`UserProfileDTO`).

3. **`src/infrastructure` (Adapters & External Systems)**
   - **`http/`**: Type-safe HTTP Client wrapping native `fetch` with AbortController timeouts, automatic Bearer authentication, and Zod response validation.
   - **`backend/`**: Gateway implementations querying external microservices, with an in-memory mock fallback for offline development.
   - **`config/`**: Environment variable parsing and validation with `dotenv` and `zod` (`getEnv()`).
   - **`logging/`**: High-performance structured logging via `pino` with pretty formatting in dev and JSON in production.
   - **`discord/`**: Discord client instantiation, event registration, and graceful shutdown listeners.

4. **`src/presentation` (Discord Interface)**
   - **`pipeline/`**: Central `InteractionPipeline` handling timing, scoped logging, error interception, and ephemeral user feedback.
   - **`commands/`**: Slash command definitions and execution (`/ping`, `/logs`).
   - **`components/`**: Interactive button handlers and modal submission handlers.
   - **`events/`**: Discord gateway event wiring (`ready`, `interactionCreate`).

5. **`src/shared` (Cross-Cutting Primitives)**
   - `Result<T, E>` pattern for explicit, monadic error handling without unexpected exceptions.
   - Base `Entity<T>` and `ValueObject<T>` classes.
   - Base `AppError` hierarchy.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js `>= 20.0.0` (LTS recommended)
- npm `>= 10.0.0`

### 2. Installation
```bash
git clone <repository_url>
cd mark-5
npm install
```

### 3. Environment Configuration
Copy the template environment file:
```bash
cp .env.example .env
```

Configure the following variables in `.env`:
```env
# Runtime
NODE_ENV=development
LOG_LEVEL=debug

# Discord Application Credentials (from Discord Developer Portal)
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here

# Optional: Development Guild ID for instantaneous slash command sync
DISCORD_GUILD_ID=your_dev_guild_id_here

# External Backend Service
BACKEND_API_URL=https://api.example.com
BACKEND_API_KEY=your_backend_secret_key
BACKEND_TIMEOUT_MS=5000

# Set to 'true' to use in-memory mock data (no backend needed for local dev)
USE_MOCK_BACKEND=true
```

### 4. Deploy Slash Commands
To register Slash Commands with the Discord REST API:
```bash
npm run deploy:commands
```
*(If `DISCORD_GUILD_ID` is set, commands sync immediately to that server. Otherwise, they are registered globally).*

### 5. Start Development
Run with live reload via `tsx`:
```bash
npm run dev
```

---

## 🛠 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the bot in development mode with live watch/reload via `tsx`. |
| `npm run typecheck` | Runs TypeScript compiler (`tsc --noEmit`) to verify strict typing. |
| `npm test` | Runs the test suite via Node's native test runner with `tsx`. |
| `npm run build` | Compiles TypeScript source files to JavaScript in `dist/`. |
| `npm start` | Starts the bot in production mode via `tsx src/index.ts`. |
| `npm run deploy:commands` | Registers application slash commands to Discord API. |

---

## 🐳 Docker Deployment

### Building the Image
```bash
docker build -t mark-5 .
```

### Running with Docker
Pass your environment configuration via `.env` file:
```bash
docker run -d \
  --name mark-5-bot \
  --restart unless-stopped \
  --env-file .env \
  mark-5
```

Features included in the Docker build:
- **Node.js 22 LTS (Alpine)** lightweight base image.
- **Tini init process** (`/sbin/tini`) for correct PID 1 process management and forwarding `SIGINT` / `SIGTERM` signals for graceful Discord bot shutdown.
- **Non-root user (`node`)** for enhanced container security.
- **Production dependencies only** (`npm ci --omit=dev`).
# mark-5
