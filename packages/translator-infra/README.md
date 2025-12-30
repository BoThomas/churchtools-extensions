# @churchtools-extensions/translator-infra

This is an internal CLI tool designed to provision and manage the Azure infrastructure required for the Translator Service. It ensures consistent environments and prevents resource duplication.

## Features

- **Interactive Setup**: Guided process to choose subscriptions, locations, and resources.
- **Idempotent**: Safe to run multiple times; it detects existing resources rather than duplicating them.
- **Auto-Deployment**: Automatically builds and deploys the `@churchtools-extensions/translator-webpubsub-access-function` to Azure.
- **Secret Management**: Prints secrets (keys, connection strings) once during setup and provides a command to re-fetch them later.
- **Secret Rotation**: Rotate API keys and secrets for existing resources with a single command.
- **Code Deployment**: Deploy updated Function App code without reprovisioning infrastructure.

## Prerequisites

1.  **Node.js**: Version 22.6.0 or higher (uses native `--experimental-strip-types`).
2.  **Azure CLI**: Must be installed on your machine (`az` command).
3.  **pnpm**: For monorepo package management.

## Usage

Run the following commands from the monorepo root:

### 1. Infrastructure Setup & Redeployment

Use this to create your Resource Group, Speech Service, and Web PubSub (including the Function App), or to redeploy the Function App code to existing resources.

```bash
pnpm run --filter @churchtools-extensions/translator-infra setup
```

### 2. Re-fetch Secrets

If you lost your API keys or connection strings, use this to print them to the console again.

```bash
pnpm run --filter @churchtools-extensions/translator-infra secrets
```

### 3. Rotate Secrets

Rotate API keys and secrets for security compliance or after a suspected breach.

```bash
pnpm run --filter @churchtools-extensions/translator-infra rotate
```

This command allows you to rotate:

- **Speech Service Keys**: Primary, secondary, or both API keys
- **Web PubSub Access Secrets**: Operator and/or reader authentication secrets
- **Web PubSub Technical Connection Key**: Primary, secondary, or both connection keys (automatically updates Function App)

## Infrastructure Resources Provisioned

- **Azure Speech Service**: For STT/TTS operations.
- **Azure Web PubSub**: For real-time browser-to-browser streaming.
- **Azure Function App**: Hosts the `webpubsub-access` function for secure access control.
- **Storage Account**: Required for the Function App runtime.
