import { input, select, confirm } from '@inquirer/prompts';
import ora from 'ora';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SetupContext } from './setup.ts';
import { resourceExists, selectLocation } from '../utils/az.ts';
import { exec, execJson } from '../utils/exec.ts';
import { logger } from '../utils/logger.ts';

/**
 * Wait for a Function App to be fully ready (provisioned and accessible).
 * Azure Function Apps can take 30-90 seconds to be fully ready after creation.
 */
async function waitForFunctionAppReady(
  functionAppName: string,
  resourceGroup: string,
  subscriptionId: string,
  maxAttempts: number = 12,
  delayMs: number = 10000,
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Check if the function app is accessible via Azure CLI
      // Note: For Flex Consumption apps, state is under properties.state
      const result = await exec(
        `az functionapp show \
          --name "${functionAppName}" \
          --resource-group "${resourceGroup}" \
          --subscription "${subscriptionId}" \
          --query "properties.state" \
          --output tsv`,
      );
      const state = result.stdout.trim();

      if (state === 'Running') {
        return; // Function App is ready
      }

      // If not running, wait and retry
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch {
      // App not found yet, wait and retry
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(
    `Function App "${functionAppName}" did not become ready within ${(maxAttempts * delayMs) / 1000} seconds`,
  );
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface WebPubSubKeys {
  primaryConnectionString: string;
  secondaryConnectionString: string;
}

export async function provisionWebPubSub(ctx: SetupContext): Promise<string[]> {
  logger.step('Configuring Web PubSub...');

  // Check if Azure Functions Core Tools are installed (required for deployment)
  try {
    await exec('func --version');
  } catch {
    const shouldInstall = await confirm({
      message:
        'Azure Functions Core Tools are required but not installed. Install now? (requires sudo)',
      default: true,
    });

    if (shouldInstall) {
      const spinner = ora('Installing Azure Functions Core Tools...').start();
      try {
        await exec('npm install -g azure-functions-core-tools@4');
        spinner.succeed('Azure Functions Core Tools installed successfully');
      } catch (error: any) {
        spinner.fail('Failed to install Azure Functions Core Tools');
        throw new Error(
          'Installation failed. Please install manually:\n' +
            'npm install -g azure-functions-core-tools@4\n' +
            'Or visit: https://docs.microsoft.com/azure/azure-functions/functions-run-local',
        );
      }
    } else {
      throw new Error(
        'Azure Functions Core Tools are required for deployment.\n' +
          'Install with: npm install -g azure-functions-core-tools@4\n' +
          'Or visit: https://docs.microsoft.com/azure/azure-functions/functions-run-local',
      );
    }
  }

  const pubsubName = await input({
    message: 'Web PubSub service name:',
    default: 'ct-ws-translator-' + Math.random().toString(36).substring(2, 8),
    validate: (v: string) =>
      /^[a-zA-Z][a-zA-Z0-9-]*$/.test(v) || 'Invalid name',
  });

  const functionAppName = await input({
    message: 'Function App name (for authentication):',
    default: `${pubsubName}-func`,
    validate: (v: string) =>
      /^[a-zA-Z][a-zA-Z0-9-]*$/.test(v) || 'Invalid name',
  });

  const storageAccountName = await input({
    message: 'Storage account name (for Function App):',
    default: pubsubName.replace(/-/g, '').slice(0, 20) + 'stor',
    validate: (v: string) =>
      /^[a-z0-9]{3,24}$/.test(v) ||
      'Must be 3-24 lowercase letters and numbers only',
  });

  const useRgLocation = await select({
    message: 'Location for Web PubSub resources:',
    choices: [
      { name: `Same as resource group (${ctx.location})`, value: ctx.location },
      { name: 'Choose different location', value: '__custom__' },
    ],
  });

  const location =
    useRgLocation === '__custom__' ? await selectLocation() : useRgLocation;

  const tier = await select({
    message: 'Web PubSub pricing tier:',
    choices: [
      { name: 'Free - 20 concurrent connections', value: 'Free_F1' },
      { name: 'Standard - Pay as you go', value: 'Standard_S1' },
    ],
  });

  // Generate secrets for operator and reader authentication
  const operatorSecret = crypto.randomBytes(32).toString('hex');
  const readerSecret = crypto.randomBytes(32).toString('hex');

  // === 1. Web PubSub ===
  const pubsubExists = await resourceExists(
    ctx.resourceGroup,
    'Microsoft.SignalRService/WebPubSub',
    pubsubName,
    ctx.subscriptionId,
  );

  if (pubsubExists) {
    logger.info(`Web PubSub "${pubsubName}" already exists`);
  } else {
    const spinner = ora(`Creating Web PubSub "${pubsubName}"...`).start();
    await exec(
      `az webpubsub create \
        --name "${pubsubName}" \
        --resource-group "${ctx.resourceGroup}" \
        --location "${location}" \
        --sku "${tier}" \
        --subscription "${ctx.subscriptionId}"`,
    );
    spinner.succeed(`Web PubSub "${pubsubName}" created`);
  }

  // Get Web PubSub connection string
  const pubsubKeys = await execJson<WebPubSubKeys>(
    `az webpubsub key show \
      --name "${pubsubName}" \
      --resource-group "${ctx.resourceGroup}" \
      --subscription "${ctx.subscriptionId}"`,
  );

  // === 2. Storage Account ===
  const storageExists = await resourceExists(
    ctx.resourceGroup,
    'Microsoft.Storage/storageAccounts',
    storageAccountName,
    ctx.subscriptionId,
  );

  if (storageExists) {
    logger.info(`Storage account "${storageAccountName}" already exists`);
  } else {
    const spinner = ora(
      `Creating Storage Account "${storageAccountName}"...`,
    ).start();
    await exec(
      `az storage account create \
        --name "${storageAccountName}" \
        --resource-group "${ctx.resourceGroup}" \
        --location "${location}" \
        --sku Standard_LRS \
        --subscription "${ctx.subscriptionId}"`,
    );
    spinner.succeed(`Storage account "${storageAccountName}" created`);
  }

  // === 3. Function App ===
  const functionExists = await resourceExists(
    ctx.resourceGroup,
    'Microsoft.Web/sites',
    functionAppName,
    ctx.subscriptionId,
  );

  if (functionExists) {
    logger.info(`Function App "${functionAppName}" already exists.`);
  } else {
    const spinner = ora(
      `Creating Flex Consumption Function App "${functionAppName}"...`,
    ).start();
    await exec(
      `az functionapp create \
        --name "${functionAppName}" \
        --resource-group "${ctx.resourceGroup}" \
        --storage-account "${storageAccountName}" \
        --flexconsumption-location "${location}" \
        --runtime node \
        --runtime-version 22 \
        --functions-version 4 \
        --disable-app-insights \
        --subscription "${ctx.subscriptionId}"`,
    );
    spinner.succeed(
      `Function App "${functionAppName}" created with Flex Consumption plan`,
    );

    // Wait for Function App to be fully provisioned before proceeding
    const readySpinner = ora(
      'Waiting for Function App to be ready (this may take up to 2 minutes)...',
    ).start();
    try {
      await waitForFunctionAppReady(
        functionAppName,
        ctx.resourceGroup,
        ctx.subscriptionId,
      );
      readySpinner.succeed('Function App is ready');
    } catch (error: any) {
      readySpinner.fail(error.message);
      throw error;
    }
  }

  // === 4. Configure Function App Settings ===
  const spinnerSettings = ora('Configuring Function App settings...').start();
  await exec(
    `az functionapp config appsettings set \
      --name "${functionAppName}" \
      --resource-group "${ctx.resourceGroup}" \
      --subscription "${ctx.subscriptionId}" \
      --settings \
        "WEBPUBSUB_CONNECTION_STRING=${pubsubKeys.primaryConnectionString}" \
        "OPERATOR_SECRET=${operatorSecret}" \
        "READER_SECRET=${readerSecret}"`,
  );
  spinnerSettings.succeed('Function App settings configured');

  // === 5. Deploy Function Code ===
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

  const functionUrl = `https://${defaultHostName}/api/webpubsub-access`;

  return [
    `WEBPUBSUB_ACCESS_FUNCTION_URL=${functionUrl}`,
    `OPERATOR_SECRET=${operatorSecret}`,
    `READER_SECRET=${readerSecret}`,
  ];
}

async function deployFunctionApp(
  functionAppName: string,
  resourceGroup: string,
  subscriptionId: string,
): Promise<void> {
  const spinner = ora('Preparing Function App...').start();

  const functionAppDir = path.resolve(
    __dirname,
    '../../../translator-webpubsub-access-function',
  );

  try {
    // 1. Install dependencies
    spinner.text = 'Installing dependencies...';
    await exec(`cd "${functionAppDir}" && npm install`);

    // 2. Generate fresh package-lock.json (since project uses pnpm, it may be outdated)
    spinner.text = 'Generating package-lock.json...';
    await exec(`cd "${functionAppDir}" && npm install --package-lock-only`);

    // 3. Deploy using Azure Functions Core Tools with retries
    spinner.text = 'Deploying to Azure...';

    const maxDeployAttempts = 5;
    const deployRetryDelayMs = 15000;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxDeployAttempts; attempt++) {
      try {
        await exec(
          `cd "${functionAppDir}" && func azure functionapp publish "${functionAppName}"`,
        );
        spinner.succeed('Function App deployed successfully');
        lastError = null;
        break;
      } catch (error: any) {
        lastError = error;
        const isAppNotFoundError =
          error.message?.includes("Can't find app with name") ||
          error.message?.includes('could not be found');

        if (isAppNotFoundError && attempt < maxDeployAttempts) {
          spinner.text = `Deployment failed (attempt ${attempt}/${maxDeployAttempts}), waiting for Function App to be fully ready...`;
          await new Promise((resolve) =>
            setTimeout(resolve, deployRetryDelayMs),
          );
        } else if (!isAppNotFoundError) {
          // Non-retryable error
          throw error;
        }
      }
    }

    if (lastError) {
      throw lastError;
    }

    // Verify deployment worked by listing functions
    spinner.text = 'Verifying function deployment...';
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5s for function to initialize

    try {
      const result = await exec(
        `az functionapp function list \
          --name "${functionAppName}" \
          --resource-group "${resourceGroup}" \
          --subscription "${subscriptionId}" \
          --output json`,
      );

      const functions = JSON.parse(result.stdout);
      if (functions && functions.length > 0) {
        const functionNames = functions.map((f: any) => f.name).join(', ');
        spinner.succeed(`Function App verified: ${functionNames} deployed`);
      } else {
        spinner.warn(
          'Function App deployed but no functions found yet. May need a moment to initialize.',
        );
      }
    } catch {
      // Function might not be immediately available after deployment
      spinner.warn(
        'Function App deployed (could not verify functions - may need a moment to initialize)',
      );
    }
  } catch (error: any) {
    spinner.fail(`Deployment failed: ${error.message}`);
    throw error;
  }
}
