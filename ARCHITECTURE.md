# Architecture Guide

This document provides a detailed overview of the architectural design, patterns, and structure used in the Mark-5 Discord bot skeleton.

---

## 1. Architectural Principles

Mark-5 follows Domain-Driven Design (DDD) and Hexagonal Architecture (Ports and Adapters). 

The primary goals of this architecture are:
- Separation of Concerns: Discord-specific presentation details, business rules, and external communication layers are decoupled.
- Testability: Core application workflows and business logic can be unit-tested without connecting to the Discord gateway or running real backend services.
- Maintainability: Changes to the Discord API (or switching presentation clients) do not require changes to backend integration logic or domain models.
- Portability: External backend APIs can be swapped, mocked, or updated with zero changes to presentation handlers.

### Dependency Rule

Dependencies always point inwards toward the Domain:
- Presentation depends on Application.
- Infrastructure implements ports defined in Domain and provides adapters for Application.
- Application depends on Domain.
- Domain depends on nothing external (pure TypeScript only).

---

## 2. Interaction Flow

The following diagram illustrates how an interaction flows through the system:

```text
               Discord Interaction (Slash Command / Event)
                                   |
                                   v
+-------------------------------------------------------------------------+
| Presentation Layer (src/presentation/discord)                           |
| - Slash Commands: PingCommand, LogsCommand                              |
| - Pipeline: InteractionPipeline (timing, error handling, logging)       |
| - Authorization gates (Discord ID whitelist, permissions)               |
+----------------------------------+--------------------------------------+
                                   | invokes use case with input DTO
                                   v
+-------------------------------------------------------------------------+
| Application Layer (src/application)                                     |
| - Use Cases: ExportLogsUseCase, GetUserProfileUseCase                   |
| - Input validation (Zod schemas)                                        |
| - Output DTO mapping                                                    |
+----------------------------------+--------------------------------------+
                                   | uses domain models & port interfaces
                                   v
+-------------------------------------------------------------------------+
| Domain Layer (src/domain)                                               |
| - Entities: UserProfile                                                 |
| - Value Objects: DiscordId (Snowflake validation)                       |
| - Port Interfaces: IBackendLogExportGateway, IBackendUserGateway        |
| - Domain Errors: UserNotFoundError, InvalidBioError                     |
+----------------------------------^--------------------------------------+
                                   | implements ports
+----------------------------------+--------------------------------------+
| Infrastructure Layer (src/infrastructure)                               |
| - Backend Gateways: BackendLogExportGateway, BackendUserGateway         |
| - Security: HmacSigner (HMAC-SHA256 authentication)                     |
| - HTTP: HttpClient (native fetch with AbortController timeouts)         |
| - Discord: Client creation, bot lifecycle, graceful shutdown            |
| - Configuration: Environment parsing & Zod validation                   |
| - Logging: Pino logger (pretty-print in dev, JSON in production)        |
+-------------------------------------------------------------------------+
```

---

## 3. Layer Breakdown

### 3.1 Domain Layer (`src/domain/`)
The domain layer represents core business concepts, rules, and boundaries. It is written in pure TypeScript with zero external dependencies.

- Entities: Business objects with a distinct identity and lifecycle (e.g., `UserProfile`).
- Value Objects: Immutable attributes validated at instantiation time (e.g., `DiscordId` which enforces 64-bit snowflake format rules).
- Ports: Interface contracts that specify what external services must provide (e.g., `IBackendLogExportGateway`, `IBackendUserGateway`). The domain defines what it needs; infrastructure determines how to fulfill it.
- Domain Errors: Explicit error classes extending `AppError` representing domain invariant violations (e.g., `UserNotFoundError`).

### 3.2 Application Layer (`src/application/`)
The application layer coordinates workflows and use cases. It acts as an orchestrator, receiving requests from the presentation layer, invoking domain services and infrastructure ports, and returning formatted data transfer objects (DTOs).

- Use Cases: Self-contained business workflows (e.g., `ExportLogsUseCase`). Each use case implements an `execute(input)` method returning a `Result<TOutput, AppError>`.
- DTOs and Boundary Validation: Input data is parsed and validated using Zod schemas before being passed to use cases. Invalid data is rejected immediately at the boundary.

### 3.3 Presentation Layer (`src/presentation/discord/`)
The presentation layer handles all interactions with Discord users.

- Interaction Pipeline (`src/presentation/discord/pipeline/`): Centralizes the handling of slash commands. It tracks execution timing, logs execution context, intercepts unhandled exceptions, and delivers consistent error messages.
- Commands (`src/presentation/discord/commands/`): Handlers implementing the `ISlashCommand` contract (e.g., `PingCommand`, `LogsCommand`). These build slash command options and delegate execution directly to application use cases.
- Security and Authorization: Command execution gates check both native Discord administrator permissions and explicit whitelisted user IDs (`DISCORD_ADMIN_IDS`) before processing sensitive operations.

### 3.4 Infrastructure Layer (`src/infrastructure/`)
The infrastructure layer houses all external tools, network communication, and framework adapters.

- HTTP Client (`src/infrastructure/http/`): A type-safe wrapper around native `fetch`. It manages `AbortController` timeouts, standard Bearer authorization headers, and HTTP status-to-error mappings.
- Backend Gateways (`src/infrastructure/backend/`): Implements domain port interfaces to talk to external REST endpoints. Includes an in-memory mock mode (`USE_MOCK_BACKEND=true`) for running the bot without an active backend.
- HMAC Signer (`src/infrastructure/backend/HmacSigner.ts`): Generates SHA256 HMAC request signatures with timestamps to authenticate administrative export requests against backend endpoints.
- Configuration (`src/infrastructure/config/`): Environment loading and validation via Zod, ensuring the application fails immediately at startup if required variables are missing or malformed.
- Logging (`src/infrastructure/logging/`): Structured logging powered by Pino. Configured to emit readable colorized output in development and compact JSON in production.

### 3.5 Shared Primitives (`src/shared/`)
Contains cross-cutting building blocks used across all layers:
- `Result<T, E>` Pattern: A functional error-handling primitive (`Result.ok()` and `Result.fail()`) that replaces throwing unexpected exceptions with explicit, typed return values.
- Base Classes: `Entity<T>`, `ValueObject<T>`, and `AppError`.

---

## 4. End-to-End Request Lifecycle: Log Export Example

To see how the layers cooperate, consider what happens when an administrator runs `/logs user-activity user_id:12345 limit:100` from their mobile Discord app:

1. Discord Gateway Trigger: Discord receives the slash command interaction and sends it to the bot over the WebSocket gateway.
2. Pipeline Interception: `InteractionPipeline` receives the event, starts an execution timer, and creates a child logger with the interaction's trace context.
3. Authorization Gate: `LogsCommand` verifies that the calling user ID matches an allowed ID configured in `DISCORD_ADMIN_IDS`. If unauthorized, an ephemeral rejection is returned immediately.
4. Deferred Reply: The command calls `interaction.deferReply()` to notify Discord that processing has started.
5. Use Case Execution: `LogsCommand` passes the parsed arguments to `ExportLogsUseCase`.
6. Input Validation: The use case validates parameters against its Zod DTO schema (`ExportLogsInputSchema`).
7. Gateway Invocation: The use case calls `IBackendLogExportGateway.exportLogs(...)`.
8. HTTP & HMAC Signing:
   - If `USE_MOCK_BACKEND=true`, the gateway generates synthetic log lines instantly in-memory.
   - If `USE_MOCK_BACKEND=false`, `HmacSigner` computes the `X-Signature` and `X-Timestamp` headers, and `HttpClient` requests the plain text log stream from the remote backend API.
9. Result Processing: The gateway returns a `Result.ok(LogExportResult)` containing the plain text content and metadata.
10. Discord Attachment Delivery: `LogsCommand` wraps the log string into a Discord `AttachmentBuilder` (.txt file) and edits the deferred reply with a summary embed and the downloadable file.

---

## 5. Adding New Features

When extending Mark-5, follow this pattern:

1. Define Port & Types (Domain):
   If your feature interacts with an external service or database, define the interface in `src/domain/<feature>/ports/`.
2. Implement the Adapter (Infrastructure):
   Create the gateway in `src/infrastructure/<feature>/` implementing the port. Add an in-memory mock fallback if you want to support offline development.
3. Write the Use Case (Application):
   Create `src/application/<feature>/use-cases/` with an input/output DTO schema. Receive the domain port via dependency injection.
4. Create the Command (Presentation):
   Implement `ISlashCommand` in `src/presentation/discord/commands/`. Inject the use case into the command constructor.
5. Wire in Bootstrap:
   Instantiate the adapter, use case, and command in `src/index.ts`, then add the command definition to `scripts/deploy-commands.ts`.
