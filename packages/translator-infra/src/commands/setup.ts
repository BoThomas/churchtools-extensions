import { checkbox, confirm, select } from '@inquirer/prompts';
import ora from 'ora';
import {
  ensureAzureCli,
  ensureLoggedIn,
  selectSubscription,
  selectOrCreateResourceGroup,
  resourceGroupExists,
  ensureProvidersRegistered,
  configureFunctionAppCors,
} from '../utils/az.ts';
import { exec, execJson } from '../utils/exec.ts';
import { logger } from '../utils/logger.ts';
import { provisionSpeechService } from './speech.ts';
import { provisionWebPubSub } from './webpubsub.ts';
import { deployFunctionApp } from '../utils/deploy.ts';

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
      {
        name: 'Update existing WebPubSub Auth Function (deploy code and/or manage CORS)',
        value: 'deploy',
      },
    ],
  });

  if (resources.length === 0) {
    logger.warn('No resources selected. Exiting.');
    return;
  }

  logger.blank();

  // Handle deploy-only flow
  if (resources.includes('deploy') && resources.length === 1) {
    await handleDeployOnly(ctx);
    return;
  }

  // Prevent mixing deploy with provisioning
  if (resources.includes('deploy')) {
    logger.error(
      'Cannot combine "Update existing WebPubSub Auth Function (deploy code and/or manage CORS)" with resource provisioning.',
    );
    logger.info('Please run setup again and select only one option.');
    process.exit(1);
  }

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
    logger.box('🔐 IMPORTANT: SECRETS (SHOWN ONCE)', [
      'Copy these values NOW. They will not be shown again.',
      "Run 'pnpm run secrets' to fetch them again later.",
      '',
      ...secrets,
    ]);
  }

  logger.blank();
  logger.success('Setup complete!');
}

interface FunctionApp {
  name: string;
  location: string;
}

interface AppSettings {
  name: string;
  value: string;
}

async function handleDeployOnly(ctx: SetupContext): Promise<void> {
  logger.info(`Looking for Function Apps in "${ctx.resourceGroup}"...`);

  const functionApps = await execJson<FunctionApp[]>(
    `az functionapp list --resource-group "${ctx.resourceGroup}"`,
  );

  if (functionApps.length === 0) {
    logger.blank();
    logger.error(
      `No Function Apps found in resource group "${ctx.resourceGroup}".`,
    );
    logger.info(
      'ℹ️  Run the full setup to create Web PubSub + Function App first',
    );
    process.exit(1);
  }

  let functionAppName: string;
  if (functionApps.length === 1) {
    functionAppName = functionApps[0].name;
    logger.info(`Found Function App: ${functionAppName}`);
  } else {
    functionAppName = await select({
      message: 'Select Function App to deploy to:',
      choices: functionApps.map((f) => ({
        name: `${f.name} (${f.location})`,
        value: f.name,
      })),
    });
  }

  // Verify it's a translator function by checking for expected settings
  logger.blank();
  logger.info('Validating Function App configuration...');

  const settings = await execJson<AppSettings[]>(
    `az functionapp config appsettings list --name "${functionAppName}" --resource-group "${ctx.resourceGroup}"`,
  );

  const hasWebPubSubConnection = settings.some(
    (s) => s.name === 'WEBPUBSUB_CONNECTION_STRING',
  );
  const hasOperatorSecret = settings.some((s) => s.name === 'OPERATOR_SECRET');
  const hasReaderSecret = settings.some((s) => s.name === 'READER_SECRET');

  if (!hasWebPubSubConnection || !hasOperatorSecret || !hasReaderSecret) {
    logger.blank();
    logger.warn(
      "⚠️  This Function App doesn't have the expected translator settings.",
    );
    logger.warn(
      `   Missing: ${[
        !hasWebPubSubConnection && 'WEBPUBSUB_CONNECTION_STRING',
        !hasOperatorSecret && 'OPERATOR_SECRET',
        !hasReaderSecret && 'READER_SECRET',
      ]
        .filter(Boolean)
        .join(', ')}`,
    );

    const shouldContinue = await confirm({
      message: 'Continue anyway?',
      default: false,
    });

    if (!shouldContinue) {
      logger.info('Deployment cancelled.');
      process.exit(0);
    }
  } else {
    logger.success('✓ Function App has all expected settings');
  }

  // Ask what the user wants to do
  logger.blank();
  const action = await select({
    message: 'What would you like to do?',
    choices: [
      {
        name: 'Deploy Function App code',
        value: 'deploy',
      },
      {
        name: 'Manage CORS settings',
        value: 'cors',
      },
      {
        name: 'Both (Deploy code + Manage CORS)',
        value: 'both',
      },
    ],
  });

  // Handle CORS configuration first if needed
  if (action === 'cors' || action === 'both') {
    await configureFunctionAppCors(
      functionAppName,
      ctx.resourceGroup,
      ctx.subscriptionId,
      true, // Skip confirmation - user already chose to manage CORS
    );
  }

  // Only deploy if requested
  if (action === 'deploy' || action === 'both') {
    // Deploy the code
    logger.blank();
    await deployFunctionApp(
      functionAppName,
      ctx.resourceGroup,
      ctx.subscriptionId,
    );

    // Get function app URL
    const result = await exec(
      `az functionapp show \
        --name "${functionAppName}" \
        --resource-group "${ctx.resourceGroup}" \
        --subscription "${ctx.subscriptionId}" \
        --query properties.defaultHostName \
        --output tsv`,
    );
    const defaultHostName = result.stdout.trim();

    logger.blank();
    logger.success('✓ Function App code deployed successfully');
    logger.blank();
    logger.info(
      `ℹ️  Function URL: https://${defaultHostName}/api/webpubsub-access`,
    );
  }

  logger.blank();
  logger.success('✓ Done!');
}
