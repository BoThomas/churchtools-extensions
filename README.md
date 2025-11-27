# ChurchTools Extensions Monorepo

This is a monorepo for building ChurchTools extensions using pnpm workspaces and Turborepo.

## Structure

```
churchtools-extensions/
├── extensions/          # Extension applications
│   └── running-dinner/  # Running Dinner extension
├── packages/            # Shared packages
│   ├── ct-utils/        # ChurchTools utilities (KV store, API types)
│   ├── persistance/     # Data persistence layer
│   └── prime-volt/      # Themed PrimeVue components
└── certs/              # SSL certificates for local HTTPS
```

## Getting Started

### Prerequisites

- Node.js
- pnpm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

## Shared Packages

### @churchtools-extensions/ct-utils

ChurchTools-specific utilities including:

- KV store API wrapper for Custom Module data storage
- TypeScript type definitions for ChurchTools API

### @churchtools-extensions/persistance

High-level data persistence layer built on top of ct-utils, providing a class-based API for CRUD operations.

### @churchtools-extensions/prime-volt

Themed PrimeVue components styled with Tailwind CSS for consistent UI across extensions.

## Development

### Working on an Extension

Navigate to an extension directory and start the dev server:

```bash
cd extensions/running-dinner
pnpm dev
```

Or use Turborepo from the root to run dev for all extensions:

```bash
pnpm dev
```

### Configuration

Each extension has its own configuration. For the running-dinner extension:

1. Navigate to `extensions/running-dinner`
2. Copy `.env-example` to `.env` and fill in your data

The `.env` file is included in `.gitignore` to prevent sensitive data from being committed to version control.

> **Note:** For local development, make sure to configure CORS in your ChurchTools
> instance to allow requests from your local development server
> (typically `https://localhost:5173`).
> This can be done in the ChurchTools admin settings under
> "API Settings" > "Integration" > "Cross-Origin Resource Sharing"

### Local HTTPS Setup

The dev server requires HTTPS with local certificates. We use [mkcert](https://github.com/FiloSottile/mkcert) to generate locally-trusted certificates.

#### Install mkcert

**macOS:**

```bash
brew install mkcert
```

**Linux (Debian/Ubuntu):**

```bash
sudo apt install libnss3-tools
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert
```

**Windows (Chocolatey):**

```bash
choco install mkcert
```

**Windows (Scoop):**

```bash
scoop install mkcert
```

#### Generate Certificates

1. Install the local CA (run once per machine):

   ```bash
   mkcert -install
   ```

2. Create and generate certificates in the `certs` folder:

   ```bash
   mkdir certs
   cd certs
   mkcert localhost 127.0.0.1 ::1
   ```

3. Rename the generated files:
   ```bash
   mv localhost+2-key.pem localhost-key.pem
   mv localhost+2.pem localhost.pem
   ```

The `certs/` folder is gitignored, so each developer needs to generate their own certificates.

### Building

Build all extensions and packages:

```bash
pnpm build
```

Build a specific extension:

```bash
turbo build --filter=churchtools-running-dinner
```

### Preview Production Build

To preview the production build locally:

```bash
pnpm preview
```

### Deployment

To build and package an extension for deployment:

```bash
cd extensions/running-dinner
pnpm deploy
```

Or from the root using Turborepo:

```bash
turbo deploy --filter=churchtools-running-dinner
```

This command will:

1. Build the extension
2. Package it using the extension's `scripts/package.js` script

You can find the package in the extension's `releases` directory.

## Adding a New Extension

1. Create a new directory in `extensions/`
2. Set up package.json with workspace package dependencies:
   ```json
   {
     "dependencies": {
       "@churchtools-extensions/ct-utils": "workspace:*",
       "@churchtools-extensions/persistance": "workspace:*",
       "@churchtools-extensions/prime-volt": "workspace:*"
     }
   }
   ```
3. Import shared packages in your code:
   ```ts
   import { PersistanceCategory } from '@churchtools-extensions/persistance';
   import Button from '@churchtools-extensions/prime-volt/Button.vue';
   ```

## ChurchTools API

Following endpoints are available. Permissions are possible per route. Types are documented in `ct-types.d.ts` (CustomModuleCreate, CustomModuleDataCategoryCreate, CustomModuleDataValueCreate)

GET `/custommodules` get all extensions
GET `/custommodules/{extensionkey}` get an extension by its key
GET `/custommodules/{moduleId}` get an extension by its ID

GET `/custommodules/{moduleId}/customdatacategories`
POST `/custommodules/{moduleId}/customdatacategories`
PUT `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}`
DELETE `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}`

GET `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}/customdatavalues`
POST `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}/customdatavalues`
PUT `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}/customdatavalues/{valueId}`
DELETE `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}/customdatavalues/{valueId}`

## Support

For questions about the ChurchTools API, visit the [Forum](https://forum.church.tools).
