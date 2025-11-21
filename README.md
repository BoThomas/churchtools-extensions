# ChurchTools Extension Boilerplate

This project provides a boilerplate for building your own extension for [ChurchTools](https://www.church.tools).

## Getting Started

### Prerequisites

- Node.js (version compatible with the project)
- pnpm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

## Configuration

Copy `.env-example` to `.env` and fill in your data.

In the `.env` file, configure the necessary constants for your project. This file is included in `.gitignore` to prevent sensitive data from being committed to version control.

## Development and Deployment

### Development Server

Start a development server with hot-reload:

```bash
pnpm dev
```

> **Note:** For local development, make sure to configure CORS in your ChurchTools
> instance to allow requests from your local development server
> (typically `http(s)://localhost:5173`).
> This can be done in the ChurchTools admin settings under
> "API Settings" > "Integration" > "Cross-Origin Resource Sharing"

### Building for Production

To create a production build:

```bash
pnpm build
```

### Preview Production Build

To preview the production build locally:

```bash
pnpm preview
```

### Deployment

To build and package your extension for deployment:

```bash
pnpm deploy
```

This command will:

1. Build the project
2. Package it using the `scripts/package.js` script

You can find the package in the `releases` directory.

## API

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
