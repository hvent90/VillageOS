# Welcome Hackathon Judges! 👋

Thank you for taking the time to evaluate VillageOS! I'm excited to share my cozy collaborative farming simulator with you.

### Get Started
Join the Discord server to interact with the bot: [https://discord.gg/PzzvE8KK](https://discord.gg/PzzvE8KK)

### Quick Commands to Try
- `/village me description:"Custom appearance"` - Customize your character
- `/village create name:"My Farm"` - Create your own village (one per server)
- `/village show` - View your village status
- `/village plant <x> <y>` - Plant crops at coordinates
- `/village water <x> <y>` - Water your crops

### The Secret Sauce
1. The underlying architecture is platform agnostic - meaning users could work on their farm together in a text group chat! This gaming platform can meet users on whatever platform they are currently using.
2. We are entering into a truly new era of interactive experiences. I've been an indie game dev for half a decade and this is the first time where a user can grow a fictional plant they made up in their mind one minute prior to seeing it live.

---

# VillageOS - Collaborative Farming Simulator

A collaborative farming simulator framework for group text chats, built with TypeScript, Node.js, React, and Prisma.

## Features

### Platform Integration
- 🌱 **Plant Lifecycle**: Plant and grow crops from seed to harvest
- 🎮 **Farming Commands**: Plant, water, harvest, and build in your village
- 😴 **Rest Management**: Manage village activities and rest periods
- 📊 **Status Tracking**: Monitor village progress with rich messaging
- 🏥 **Maintenance System**: Manage village upkeep and maintenance
- ⏰ **Cooldown System**: Balanced gameplay with command cooldowns

### Web Admin Interface
- 📱 **Admin Dashboard**: Web-based interface for managing villages
- 👥 **Village Management**: View, edit, and monitor all villages
- 💬 **Chat Interface**: Admin chat interface for testing commands
- 📊 **Real-time Updates**: Live village status monitoring
- 🔐 **Authentication**: Secure admin access with API keys

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Twilio account (for SMS integration)
- Supabase account (for media storage)
- Gemini AI API key (for image generation)

## Setup

1. **Clone the repository**
   ```bash
    git clone <repository-url>
    cd village-os
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
    ```bash
    cp .env.example .env
    ```

    Edit `.env` with your configuration:
    ```env
    # Database Configuration
    DATABASE_URL="postgresql://username:password@localhost:5432/village_os"

    # Twilio Configuration
    TWILIO_ACCOUNT_SID="your_twilio_account_sid"
    TWILIO_AUTH_TOKEN="your_twilio_auth_token"
    TWILIO_PHONE_NUMBER="your_twilio_phone_number"

    # Game Balance Configuration
    RANDOM_EVENT_CHANCE=25
    COMMAND_COOLDOWN_SOLO_SECONDS=600
    COMMAND_COOLDOWN_SOCIAL_SECONDS=1800

    # Web Server Configuration
    PORT=3000
    ADMIN_API_KEY="your-admin-api-key-here"

    # Media Upload Configuration
    SUPABASE_URL="your-supabase-url"
    SUPABASE_ANON_KEY="your-supabase-anon-key"
    SUPABASE_BUCKET_NAME="VillageOS"

    # Gemini AI Configuration
    GEMINI_API_KEY="your-gemini-api-key"

    # Evolution Configuration
    EVOLUTION_TESTING_MODE=true
    ```

4. **Set up the database**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Build the project**
   ```bash
   npm run build
   ```

## Running VillageOS

### Development

#### Run Everything (Bot + Web Interface)
```bash
npm run dev
```

#### Run Platform Integration Only
```bash
npm run dev:platform
```

#### Run Web Interface Only
```bash
npm run web
```

#### Run Web Interface Components Separately
```bash
# Terminal 1 - Express server (API + routing)
npm run dev:web

# Terminal 2 - React frontend (Vite dev server)
npm run dev:vite
```

### Production

#### Build and Run Everything
```bash
npm run build
npm start
```

#### Build and Run Web Interface Only
```bash
npm run build
npm run start:web
```

### Access Points

- **SMS Integration**: Active via Twilio SMS
- **Web Admin Interface**: http://localhost:3000
- **API Endpoints**: http://localhost:3000/api/*

## Available Commands

### Discord Slash Commands
- `/village create name:"My Farm" description:"A peaceful countryside village with rolling hills"` - Create a new village with AI-generated landscape
- `/village show` - Display village status
- `/village plant <x> <y>` - Plant crops at coordinates
- `/village water <x> <y>` - Water crops at coordinates
- `/village build <x> <y>` - Build structures at coordinates
- `/village me <description>` - 🎨 Customize your character appearance

### Character Customization
- `/village me description:"I want to look like a farmer with red hair and overalls"`
  - Generates a new character appearance using AI

### Village Creation
- `/village create name:"My Farm" description:"A peaceful countryside village with rolling hills"`
  - Creates a new village with AI-generated landscape image
  - Optional description customizes the village's appearance
  - Generated image serves as the village's visual representation
  - Updates your baseline image for all future village interactions

### Legacy SMS Commands
- `!village create <name>` - Create a new village
- `!village status` - Check your village's current status
- `!village plant` - Plant crops in your village
- `!village water` - Water your crops (increases growth)
- `!village harvest` - Harvest mature crops
- `!village build` - Build structures in your village
- `!village rest` - Rest your village workers
- `!village work` - Resume village activities

## Twilio SMS Setup

1. Create a Twilio account at https://www.twilio.com
2. Get your Account SID, Auth Token, and purchase a phone number
3. Add these credentials to your `.env` file
4. Configure your Twilio phone number for SMS

## Web Admin Interface

The web interface provides a comprehensive admin dashboard for managing villages and testing commands.

### Features
- **Dashboard**: Overview of all villages and system status
- **Village Management**: View, edit, and monitor individual villages
- **Chat Interface**: Test bot commands through a web-based chat
- **Real-time Updates**: Live status monitoring and updates

### Accessing the Interface
1. Start the web interface: `npm run web`
2. Open http://localhost:3000 in your browser
3. Use the sidebar to navigate between sections:
    - **Dashboard**: System overview
    - **Villages**: Manage all villages
    - **Chat**: Test commands

### API Endpoints
- `GET /api/villages` - List all villages
- `GET /api/villages/:id` - Get specific village details
- `POST /api/villages/:id` - Update village stats
- `POST /api/chat/command` - Send chat commands

## Architecture

The application follows a modular architecture with clear separation of concerns:

### Backend Services
- **TwilioPlatformAdapter**: Handles SMS platform integration
- **CommandProcessorService**: Processes and routes user commands
- **GameLogicService**: Contains all game logic and village management
- **UserRepository**: Database operations for users
- **VillageRepository**: Database operations for villages
- **MediaGenerationService**: Handles AI-powered image generation
- **SupabaseMediaService**: Manages media storage and uploads

### Web Interface
- **Express Server** (`src/web/server.ts`): API server and SPA routing
- **React Frontend** (`src/web/client/`): Admin dashboard built with React + TypeScript
- **API Routes**: RESTful endpoints for village management and chat
- **WebSocket Support**: Real-time communication for admin chat

### Project Structure
```
src/
├── config/          # Configuration files
├── repositories/    # Data access layer
├── services/        # Business logic services
├── types/           # TypeScript type definitions
├── web/             # Web interface
│   ├── client/      # React frontend
│   ├── routes/      # API routes
│   └── server.ts    # Express server
└── main.ts          # Application entry point
```

## Development

### Project Structure
```
src/
├── config/          # Configuration files
├── repositories/    # Data access layer
├── services/        # Business logic services
├── types/           # TypeScript type definitions
├── web/             # Web interface
│   ├── client/      # React frontend (Vite)
│   │   ├── src/
│   │   │   ├── components/  # React components
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   └── lib/         # Utilities
│   │   └── index.html       # HTML template
│   ├── routes/      # Express API routes
│   ├── middleware/  # Express middleware
│   └── server.ts    # Express server
└── main.ts          # Application entry point
```

### Building
```bash
# Build everything (bot + web)
npm run build

# Build web only
npm run build:web

# Build server only
npm run build:server
```

### Testing
```bash
# Run Jest tests
npm test

# Run basic functionality test
node test-basic.js
```

### Development Workflows

#### Frontend Development
```bash
# Full development environment (bot + web)
npm run dev

# Web interface only
npm run web

# Frontend hot reload only
npm run dev:vite
```

#### API Development
```bash
# Backend API with auto-reload
npm run dev:web
```

## Environment Variables

### Required Variables
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio phone number |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `GEMINI_API_KEY` | Google Gemini AI API key |

### Optional Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Web server port | 3000 |
| `ADMIN_API_KEY` | API key for admin access | Required for web |
| `SUPABASE_BUCKET_NAME` | Supabase storage bucket | VillageOS |
| `RANDOM_EVENT_CHANCE` | Chance of random events (0-100) | 25 |
| `COMMAND_COOLDOWN_SOLO_SECONDS` | Solo command cooldown | 600 |
| `COMMAND_COOLDOWN_SOCIAL_SECONDS` | Social command cooldown | 1800 |
| `EVOLUTION_TESTING_MODE` | Enable evolution testing | false |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
