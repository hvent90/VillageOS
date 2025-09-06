# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
VillageOS is a collaborative farming simulator framework for group text chats built with TypeScript, Node.js, and Prisma with PostgreSQL.

## Development Commands

### Building and Running
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Development mode with hot reload using nodemon and ts-node
- `npm start` - Start production build from `dist/main.js`
- `npm run watch` - Watch mode for TypeScript compilation

### Testing
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `node test-basic.js` - Run basic functionality test

### Database Operations
- `npx prisma migrate dev` - Create and apply new migration
- `npx prisma generate` - Generate Prisma client after schema changes
- `npx prisma studio` - Open Prisma Studio for database inspection
- `npx prisma db push` - Push schema changes without migration (dev only)

## Architecture

The application follows a layered architecture with dependency injection:

### Core Services
- **TwilioPlatformAdapter** (`src/adapters/twilioPlatformAdapter.ts`): Handles SMS platform integration
- **CommandProcessorService** (`src/services/commandProcessorService.ts`): Routes and processes user commands
- **GameLogicService** (`src/services/gameLogicService.ts`): Contains all village farming logic, crop growth calculations, and collaborative mechanics
- **SchedulerService** (`src/services/schedulerService.ts`): Manages scheduled events and background tasks

### Data Layer
- **UserRepository** (`src/repositories/userRepository.ts`): Database operations for user entities
- **VillageRepository** (`src/repositories/villageRepository.ts`): Database operations for village entities

### Configuration
- **Environment Config** (`src/config/environment.ts`): Loads and validates environment variables
- **Database Config** (`src/config/database.ts`): Prisma client initialization and connection management
- **Logger** (`src/config/logger.ts`): Pino-based structured logging

### Database Schema (Prisma)
- **User**: Core entity for user identification and management
- **Village**: Core entity for village management and configuration
- **VillageMember**: Junction entity linking users to villages
- **VillageObject**: Entity for objects placed in villages (plants, structures)
- **MediaGenerationQueue**: Queue for async media generation tasks
- **GameConfiguration**: Key-value store for configurable game settings
- Uses PostgreSQL with UUID primary keys and proper indexing

## Key Commands
All commands use `!village` prefix:
- `!village create <name>` - Create new village (one per user)
- `!village status` - Display village stats
- `!village plant/water/harvest/build` - Farming actions affecting different stats
- `!village rest/work` - Activity management
- Cooldown system: 600s for solo actions, 1800s for social actions

## Environment Setup
Required variables in `.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number
- `RANDOM_EVENT_CHANCE` - Random event probability (default: 25)
- `COMMAND_COOLDOWN_SOLO_SECONDS` - Solo action cooldown (default: 600)
- `COMMAND_COOLDOWN_SOCIAL_SECONDS` - Social action cooldown (default: 1800)

## Development Workflow

1. **Database Changes**: Always update `prisma/schema.prisma` first, then run `npx prisma migrate dev` and `npx prisma generate`
2. **Service Dependencies**: Services are injected via constructor dependency injection - update `src/main.ts` for new service integrations
3. **Platform Integration**: All platform interactions go through platform adapters - never use platform SDKs directly in other services
4. **Logging**: Use structured logging via the logger from `src/config/logger.ts` with event-based messages
5. **Error Handling**: All async operations should have proper try-catch blocks with structured error logging

## Testing Strategy
- Jest configuration in `jest.config.js` with ts-jest preset
- Tests located in `tests/` directory and `**/*.test.ts` files
- Coverage collection from `src/**/*.ts` excluding type definitions
- Use `test-basic.js` for integration testing

## Entry Point
Application starts in `src/main.ts` which:
1. Loads environment variables and configuration
2. Connects to database
3. Initializes all repositories and services with dependency injection
4. Sets up platform integration with command processor
5. Handles graceful shutdown on SIGINT/SIGTERM