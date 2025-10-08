# Berichtsheft Web Application

A Next.js application for managing training reports (Berichtsheft) with PDF generation capabilities.

## Quick Start

### Development Mode

```bash
./start-dev.sh
# Starts development server on port 9455 with hot reload
```

### Production Deployment

**First time setup:**
```bash
./build.sh          # Build the application
./start.sh          # Start the production server
```

**Updates/Redeployment:**
```bash
./deploy.sh         # Pull, build, migrate, and restart
```

## Manual Setup

### Prerequisites
- Node.js 20+
- npm or yarn
- SQLite

### Installation

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your settings

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed training professions
npm run seed

# Build for production
npm run build

# Start production server
PORT=9455 npm start
```

## Scripts

- `./start-dev.sh` - Start development server with hot reload
- `./start.sh` - Start production server (requires build)
- `./build.sh` - Build the application
- `./deploy.sh` - Full deployment (pull, build, migrate, restart)

## Docker Deployment

See [DOCKER.md](DOCKER.md) for Docker deployment instructions.

## Features

- User authentication with JWT
- Training report management
- PDF generation from LaTeX templates
- Training profession search
- Vacation period tracking
- Dark mode support

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT
- **Styling**: Tailwind CSS
- **PDF Generation**: LaTeX.js

## Project Structure

```
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   └── lib/              # Utilities and helpers
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Database migrations
├── public/               # Static files
└── temp/                 # Temporary PDF storage
```

## Environment Variables

```bash
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-key"
PORT=9455
```

## License

Private project
