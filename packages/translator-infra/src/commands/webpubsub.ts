import { input, select, confirm } from '@inquirer/prompts';
import archiver from 'archiver';
import { createWriteStream } from 'node:fs';
import ora from 'ora';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { SetupContext } from './setup.ts';
import { resourceExists, selectLocation } from '../utils/az.ts';
import { exec, execJson } from '../utils/exec.ts';
import { logger } from '../utils/logger.ts';

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

async function zipDirectory(sourceDir: string, outPath: string): Promise<void> {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const stream = createWriteStream(outPath);

  return new Promise((resolve, reject) => {
    archive
      .directory(path.join(sourceDir, 'dist'), 'dist')
      .file(path.join(sourceDir, 'host.json'), { name: 'host.json' })
      .file(path.join(sourceDir, 'package.json'), { name: 'package.json' })
      .file(path.join(sourceDir, 'package-lock.json'), {
        name: 'package-lock.json',
      })
      // Don't include node_modules - let Azure install them with remote build
      // This is required for Flex Consumption plans
      .on('error', (err) => reject(err))
      .pipe(stream);

    stream.on('close', () => resolve());
    archive.finalize();
  });
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
  const tempZipPath = path.resolve(__dirname, '../../.func-deploy.zip');

  try {
    // 1. Install & Build
    spinner.text = 'Building Function App...';
    await exec(`cd "${functionAppDir}" && pnpm install && pnpm build`);

    // 2. Zip using archiver (cross-platform)
    spinner.text = 'Creating deployment package...';
    await zipDirectory(functionAppDir, tempZipPath);

    // 3. Deploy using Azure Functions Core Tools with --nozip (skips buggy remote build)
    spinner.text = 'Deploying to Azure using func tools...';
    await exec(
      `cd "${functionAppDir}" && func azure functionapp publish "${functionAppName}" --nozip`,
    );
    spinner.succeed('Function App deployed successfully');

    // Clean up
    if (await fs.stat(tempZipPath).catch(() => false)) {
      await fs.unlink(tempZipPath);
    }

    // Verify deployment worked by testing the function endpoint
    spinner.text = 'Verifying function deployment...';
    try {
      const result = await exec(
        `az functionapp function show \
          --name "${functionAppName}" \
          --resource-group "${resourceGroup}" \
          --subscription "${subscriptionId}" \
          --function-name webpubsub-access \
          --output table`,
      );
      if (result.stdout.includes('webpubsub-access')) {
        spinner.succeed('Function App deployed and verified successfully');
      } else {
        spinner.succeed('Function App deployed (verification pending)');
      }
    } catch {
      // Function might not be immediately available after deployment
      spinner.succeed(
        'Function App deployed (function may take a moment to initialize)',
      );
    }
  } catch (error: any) {
    if (await fs.stat(tempZipPath).catch(() => false)) {
      await fs.unlink(tempZipPath);
    }
    spinner.fail(`Deployment failed: ${error.message}`);
    throw error;
  }
}
