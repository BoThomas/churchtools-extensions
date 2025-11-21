# ChurchTools Translator Extension

Real-time speech-to-text translation extension for ChurchTools using Microsoft Azure Cognitive Services.

## Features

- Real-time speech-to-text with translation
- Support for multiple input/output languages
- Live presentation mode with customizable styling
- Session logging and usage statistics
- Configurable profanity filtering and phrase lists

## Prerequisites

- ChurchTools instance
- Azure Cognitive Services Speech API key and region

## Development Setup

1. Copy `.env.example` to `.env` and configure:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your settings:

   ```env
   VITE_KEY=translator
   VITE_API_BASE_URL=https://your-churchtools-instance.com
   VITE_EXTERNAL_API_URL=https://your-churchtools-instance.com

   # Development only
   VITE_USERNAME=your-username
   VITE_PASSWORD=your-password
   ```

3. Install dependencies (from monorepo root):

   ```bash
   pnpm install
   ```

4. Start development server:
   ```bash
   pnpm dev
   ```

## Building for Production

```bash
pnpm build
```

## Deployment

1. Build the extension:

   ```bash
   pnpm deploy
   ```

2. Upload the generated ZIP file from `releases/` to your ChurchTools instance
3. Install via Admin → Extensions → Upload Extension

## Azure Setup

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a Cognitive Services resource (Speech Services)
3. Navigate to "Keys and Endpoint"
4. Copy one of the keys and the region
5. Configure in the Settings tab of the extension

## Usage

### Settings Tab

Configure your Azure API credentials.

### Translate Tab

- Select input/output languages
- Configure translation options (profanity filter, phrase list, etc.)
- Customize presentation styling
- Start presentation mode or test locally

### Reports Tab

View usage statistics and session logs.
