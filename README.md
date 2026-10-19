# Mark-5

[![CI](https://github.com/o-200/mark-5/actions/workflows/ci.yml/badge.svg)](https://github.com/o-200/mark-5/actions/workflows/ci.yml)

> A structured, production-ready Discord bot skeleton built with TypeScript, discord.js v14, Zod, and Domain-Driven Design (DDD).

---

## Motivation

When running an active product or service, users frequently reach out for support directly inside Discord. When someone reports an urgent issue—such as a failed transaction, an account issue, or an error in a workflow—traditional debugging workflows create friction:

- You have to open a laptop, connect to a corporate VPN or bastion host, log into a cloud console, or search through heavy monitoring dashboards.
- By the time you find the relevant logs, valuable triage time has passed, especially if you are away from your desk.

Mark-5 was created to solve this problem.

With Mark-5, team members can interact with backend logs directly from mobile phones, without permanent loggining into internal systems through Discord slash commands:

- When a user asks for assistance, you can type `/logs user-activity user_id:<uuid>` or `/logs user-activity email:<email>` directly in Discord.
- The bot queries your backend API, verifies administrative authorization, and streams the relevant plain-text log records straight into the channel or support thread as a downloadable file attachment.
- You can inspect recent events on the spot from your phone and respond to the user immediately.

Because administrative commands expose sensitive logs, Mark-5 is built with robust security controls: strict Discord user ID authorization gates, HMAC-SHA256 request signatures, input boundaries validated with Zod, and a decoupled architecture that ensures your bot remains reliable and testable as your backend grows.

---

## Features

- Mobile Support Triage: Query and download plain-text activity logs (`user-activity`, `loader`, `product`) directly inside Discord from mobile or desktop.
- Plug-and-Play Backend Gateway: Connect to your real REST/HTTP backend or enable `USE_MOCK_BACKEND=true` to use in-memory synthetic data for offline local development without spinning up external microservices.
- Strict End-to-End Type Safety: Built with TypeScript 5 and Zod. Environment variables, API responses, and user inputs are strictly validated.
- Enterprise Security: Slash commands enforce native Discord administrator permissions and explicit user ID whitelist verification (`DISCORD_ADMIN_IDS`). Outgoing requests to backend endpoints include HMAC-SHA256 signatures with timestamp validation.
- Predictable Error Handling: Implements the `Result<T, E>` pattern to replace unexpected exceptions with explicit, typed error states.
- Structured Logging: Uses Pino for structured logging—clean, readable colorized logs in development and structured JSON in production.
- Zero-Dependency Testing: Includes 50+ unit and integration tests executing on Node's native test runner (`node --test`).
- Production-Ready Docker Image: Multi-stage build on lightweight Alpine Linux running as a non-root user with `tini` for graceful signal forwarding (`SIGINT`/`SIGTERM`).

---

## Quickstart

### 1. Prerequisites

- Node.js `>= 20.0.0` (LTS recommended)
- npm `>= 10.0.0`
- A Discord Bot application configured in the [Discord Developer Portal](https://discord.com/developers/applications)

### 2. Clone and Install

```bash
git clone https://github.com/your-username/mark-5.git
cd mark-5
npm install
```

### 3. Configure Environment Variables

Create your `.env` file from the provided template:

```bash
cp .env.example .env
```

Configure your environment settings in `.env`:

```env
# Runtime
NODE_ENV=development
LOG_LEVEL=debug

# Discord Bot Credentials
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_client_id_here
DISCORD_GUILD_ID=your_test_server_id_here
DISCORD_ADMIN_IDS=your_discord_user_id_here

# Backend Service API
BACKEND_API_URL=http://localhost:3000
LOGS_EXPORT_SECRET_KEY=any_random_string_or_shared_secret
BACKEND_TIMEOUT_MS=5000

# Set to true to run offline with mock data (no real backend needed for local dev)
USE_MOCK_BACKEND=true
```

> Note on `DISCORD_GUILD_ID`:
> Providing a Guild ID deploys slash commands immediately to that specific server. If left blank, commands are registered globally, which can take Discord up to an hour to propagate.

### 4. Deploy Slash Commands

Register the slash commands with the Discord REST API:

```bash
npm run deploy:commands
```

### 5. Start the Bot

Start the bot in development mode with live watch and reload:

```bash
npm run dev
```

---

## Included Commands

Mark-5 includes two administrative slash commands:

| Command | Subcommands & Options | Description |
|---|---|---|
| `/ping` | None | Verifies bot responsiveness, WebSocket heartbeat, uptime, and runtime version. |
| `/logs` | `user-activity`<br>`loader`<br>`product` | Fetches activity logs from the backend. Restricts execution to authorized admin IDs (`DISCORD_ADMIN_IDS`), filters records by `user_id`, `email`, or `limit`, and delivers results as a `.txt` file attachment. |

---

## Architecture Overview

Mark-5 is structured around Domain-Driven Design (DDD) and Hexagonal Architecture (Ports and Adapters) to keep Discord presentation logic completely isolated from business rules and external backend APIs.

```text
src/
├── domain/             # Core business entities, value objects, and gateway port interfaces
├── application/        # Use cases and input/output DTOs with Zod validation
├── presentation/       # Discord slash commands, event pipeline, and error handling
├── infrastructure/     # HTTP client, backend gateways, Discord client, config, and logging
├── shared/             # Result pattern and base primitive classes
└── index.ts            # Application bootstrap and dependency wiring
```

For a comprehensive guide detailing layer interactions, request lifecycles, and how to add new features, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the bot in development mode with live watch/reload via `tsx`. |
| `npm run deploy:commands` | Deploys slash commands to Discord API. |
| `npm test` | Runs the full test suite using Node's native test runner (`node --test`). |
| `npm run typecheck` | Runs the TypeScript compiler (`tsc --noEmit`) to verify strict typing. |
| `npm run build` | Compiles TypeScript source files into JavaScript in `dist/`. |
| `npm start` | Runs the compiled bot in production mode. |

---

## Docker Deployment

### Build the Image

```bash
docker build -t mark-5 .
```

### Run the Container

Pass the configuration via your `.env` file:

```bash
docker run -d \
  --name mark-5-bot \
  --restart unless-stopped \
  --env-file .env \
  mark-5
```

### View Container Logs

```bash
docker logs -f mark-5-bot
```

---

## Testing

The test suite covers domain invariants, value objects, use case input validation, HMAC signature computation, and Discord command authorization gates.

Run all tests:

```bash
npm test
```

Run a specific test file:

```bash
node --import tsx --test tests/domain/user.test.ts
```

---

## License

This project is licensed under the [MIT License](LICENSE).
