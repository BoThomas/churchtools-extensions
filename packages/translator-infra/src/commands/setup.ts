import { checkbox, confirm } from '@inquirer/prompts';
import ora from 'ora';
import {
  ensureAzureCli,
  ensureLoggedIn,
  selectSubscription,
  selectOrCreateResourceGroup,
  resourceGroupExists,
  ensureProvidersRegistered,
} from '../utils/az.ts';
import { exec } from '../utils/exec.ts';
import { logger } from '../utils/logger.ts';
import { provisionSpeechService } from './speech.ts';
import { provisionWebPubSub } from './webpubsub.ts';

export interface SetupContext {
  subscriptionId: string;
  resourceGroup: string;
  location: string;
}

export async function runSetup(): Promise<void> {
  logger.blank();
  logger.box('Azure Infrastructure Setup', [
    'This wizard will guide you through provisioning',
    'Azure resources for the translator service.',
  ]);
  logger.blank();

  // Step 1: Ensure Azure CLI is installed
  await ensureAzureCli();

  // Step 2: Ensure user is logged in
  await ensureLoggedIn();

  // Step 3: Select subscription
  const subscriptionId = await selectSubscription();

  // Step 4: Ensure required providers are registered
  await ensureProvidersRegistered(subscriptionId);

  // Step 5: Select or create resource group
  const { name: rgName, location, isNew } = await selectOrCreateResourceGroup();

  if (isNew) {
    const exists = await resourceGroupExists(rgName);
    if (exists) {
      logger.info(`Resource group "${rgName}" already exists, using it.`);
    } else {
      const spinner = ora(`Creating resource group "${rgName}"...`).start();
      await exec(
        `az group create --name "${rgName}" --location "${location}" --subscription "${subscriptionId}"`,
      );
      spinner.succeed(`Resource group "${rgName}" created`);
    }
  }

  const ctx: SetupContext = {
    subscriptionId,
    resourceGroup: rgName,
    location,
  };

  // Step 6: Select which resources to provision
  const resources = await checkbox({
    message: 'Which resources do you want to provision?',
    choices: [
      {
        name: 'Speech Service (for speech-to-text / text-to-speech)',
        value: 'speech',
      },
      {
        name: 'Web PubSub (for real-time streaming between operators and users)',
        value: 'webpubsub',
      },
    ],
  });

  if (resources.length === 0) {
    logger.warn('No resources selected. Exiting.');
    return;
  }

  logger.blank();

  // Step 7: Provision selected resources
  const secrets: string[] = [];

  if (resources.includes('speech')) {
    const speechSecrets = await provisionSpeechService(ctx);
    secrets.push(...speechSecrets);
  }

  if (resources.includes('webpubsub')) {
    const pubsubSecrets = await provisionWebPubSub(ctx);
    secrets.push(...pubsubSecrets);
  }

  // Step 8: Print secrets ONCE
  if (secrets.length > 0) {
    logger.blank();
    logger.box('⚠️  IMPORTANT: SECRETS (SHOWN ONCE)', [
      'Copy these values NOW. They will not be shown again.',
      "Run 'pnpm run secrets' to fetch them again later.",
      '',
      ...secrets,
    ]);
  }

  logger.blank();
  logger.success('Setup complete!');
}
