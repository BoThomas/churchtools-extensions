import { input, select } from '@inquirer/prompts';
import ora from 'ora';
import type { SetupContext } from './setup.ts';
import { resourceExists, selectLocation } from '../utils/az.ts';
import { exec, execJson } from '../utils/exec.ts';
import { logger } from '../utils/logger.ts';

interface SpeechServiceKeys {
  key1: string;
  key2: string;
}

interface SpeechService {
  name: string;
  location: string;
  properties: {
    endpoint: string;
  };
}

export async function provisionSpeechService(
  ctx: SetupContext,
): Promise<string[]> {
  logger.step('Configuring Speech Service...');

  const name = await input({
    message: 'Speech Service name:',
    default: 'ct-speech-service-' + Math.random().toString(36).substring(2, 8),
    validate: (v) =>
      /^[a-zA-Z][a-zA-Z0-9-]*$/.test(v) ||
      'Invalid name (alphanumeric and hyphens only, must start with letter)',
  });

  const useRgLocation = await select({
    message: 'Location for Speech Service:',
    choices: [
      {
        name: `Same as resource group (${ctx.location})`,
        value: ctx.location,
      },
      { name: 'Choose different location', value: '__custom__' },
    ],
  });

  const location =
    useRgLocation === '__custom__' ? await selectLocation() : useRgLocation;

  const tier = await select({
    message: 'Pricing tier:',
    choices: [
      { name: 'Free (F0) - 5 hours/month', value: 'F0' },
      { name: 'Standard (S0) - Pay as you go', value: 'S0' },
    ],
  });

  // Check if resource already exists
  const exists = await resourceExists(
    ctx.resourceGroup,
    'Microsoft.CognitiveServices/accounts',
    name,
    ctx.subscriptionId,
  );

  if (exists) {
    logger.info(`Speech Service "${name}" already exists, fetching keys...`);
  } else {
    const spinner = ora(`Creating Speech Service "${name}"...`).start();

    try {
      await exec(
        `az cognitiveservices account create \
          --name "${name}" \
          --resource-group "${ctx.resourceGroup}" \
          --location "${location}" \
          --kind SpeechServices \
          --sku "${tier}" \
          --subscription "${ctx.subscriptionId}" \
          --yes`,
      );
      spinner.succeed(`Speech Service "${name}" created`);
    } catch (error) {
      spinner.fail(`Failed to create Speech Service`);
      throw error;
    }
  }

  // Fetch keys and endpoint
  const keys = await execJson<SpeechServiceKeys>(
    `az cognitiveservices account keys list \
      --name "${name}" \
      --resource-group "${ctx.resourceGroup}" \
      --subscription "${ctx.subscriptionId}"`,
  );

  const service = await execJson<SpeechService>(
    `az cognitiveservices account show \
      --name "${name}" \
      --resource-group "${ctx.resourceGroup}" \
      --subscription "${ctx.subscriptionId}"`,
  );

  return [
    `SPEECH_KEY=${keys.key1}`,
    `SPEECH_REGION=${service.location}`,
    `SPEECH_ENDPOINT=${service.properties.endpoint}`,
  ];
}
