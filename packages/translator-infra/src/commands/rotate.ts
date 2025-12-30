import { confirm, select } from '@inquirer/prompts';
import {
  ensureAzureCli,
  ensureLoggedIn,
  selectSubscription,
} from '../utils/az.ts';
import { execJson, exec } from '../utils/exec.ts';
import { logger } from '../utils/logger.ts';
import { randomBytes } from 'node:crypto';

interface ResourceGroup {
  name: string;
}

interface SpeechServiceKeys {
  key1: string;
  key2: string;
}

interface SpeechService {
  name: string;
  location: string;
  properties: { endpoint: string };
}

interface FunctionApp {
  name: string;
  location: string;
}

interface AppSettings {
  name: string;
  value: string;
}

interface WebPubSub {
  name: string;
  location: string;
}

interface WebPubSubKeys {
  primaryKey: string;
  primaryConnectionString: string;
  secondaryKey: string;
  secondaryConnectionString: string;
}

function generateSecret(): string {
  return randomBytes(32).toString('hex');
}

async function rotateSpeechServiceKeys(resourceGroup: string): Promise<void> {
  const services = await execJson<SpeechService[]>(
    `az cognitiveservices account list --resource-group "${resourceGroup}" --query "[?kind=='SpeechServices']"`,
  );

  if (services.length === 0) {
    logger.error(
      `No Speech Services found in resource group "${resourceGroup}".`,
    );
    logger.info('Run the setup command first to create resources.');
    process.exit(1);
  }

  let serviceName: string;
  if (services.length === 1) {
    serviceName = services[0].name;
    logger.info(`Using Speech Service: ${serviceName}`);
  } else {
    serviceName = await select({
      message: 'Select Speech Service:',
      choices: services.map((s) => ({
        name: `${s.name} (${s.location})`,
        value: s.name,
      })),
    });
  }

  const keyChoice = await select({
    message: 'Which key(s) to rotate?',
    choices: [
      { name: 'Primary Key (key1)', value: 'key1' },
      { name: 'Secondary Key (key2)', value: 'key2' },
      { name: 'Both Keys (one at a time)', value: 'both' },
    ],
  });

  const keysToRotate = keyChoice === 'both' ? ['key1', 'key2'] : [keyChoice];
  const rotatedKeys: string[] = [];

  for (const keyName of keysToRotate) {
    logger.blank();
    logger.info(
      `Rotating ${keyName === 'key1' ? 'Primary' : 'Secondary'} Key...`,
    );

    await exec(
      `az cognitiveservices account keys regenerate \
        --name "${serviceName}" \
        --resource-group "${resourceGroup}" \
        --key-name "${keyName}"`,
    );

    logger.success(
      `${keyName === 'key1' ? 'Primary' : 'Secondary'} Key rotated successfully`,
    );
  }

  // Fetch the new keys
  const keys = await execJson<SpeechServiceKeys>(
    `az cognitiveservices account keys list --name "${serviceName}" --resource-group "${resourceGroup}"`,
  );

  const service = services.find((s) => s.name === serviceName)!;

  logger.blank();
  if (keysToRotate.includes('key1')) {
    rotatedKeys.push(`SPEECH_KEY=${keys.key1}`);
  }
  if (keysToRotate.includes('key2')) {
    rotatedKeys.push(`SPEECH_KEY=${keys.key2}`);
  }
  rotatedKeys.push(
    `SPEECH_REGION=${service.location}`,
    `SPEECH_ENDPOINT=${service.properties.endpoint}`,
  );

  logger.box('🔐 NEW SECRETS', rotatedKeys);
  logger.blank();
  logger.warn('⚠️  Update your applications with the new key(s)');
}

async function rotateWebPubSubAccessSecrets(
  resourceGroup: string,
): Promise<void> {
  const functionApps = await execJson<FunctionApp[]>(
    `az functionapp list --resource-group "${resourceGroup}"`,
  );

  if (functionApps.length === 0) {
    logger.error(
      `No Function Apps found in resource group "${resourceGroup}".`,
    );
    logger.info('Run the setup command first to create resources.');
    process.exit(1);
  }

  let functionAppName: string;
  if (functionApps.length === 1) {
    functionAppName = functionApps[0].name;
    logger.info(`Using Function App: ${functionAppName}`);
  } else {
    functionAppName = await select({
      message: 'Select Function App:',
      choices: functionApps.map((f) => ({
        name: `${f.name} (${f.location})`,
        value: f.name,
      })),
    });
  }

  const secretChoice = await select({
    message: 'Which secret(s) to rotate?',
    choices: [
      { name: 'OPERATOR_SECRET', value: 'OPERATOR_SECRET' },
      { name: 'READER_SECRET', value: 'READER_SECRET' },
      { name: 'Both Secrets', value: 'both' },
    ],
  });

  const secretsToRotate =
    secretChoice === 'both'
      ? ['OPERATOR_SECRET', 'READER_SECRET']
      : [secretChoice];
  const newSecrets: string[] = [];

  for (const secretName of secretsToRotate) {
    logger.blank();
    logger.info(`Generating new ${secretName}...`);

    const newSecret = generateSecret();

    await exec(
      `az functionapp config appsettings set \
        --name "${functionAppName}" \
        --resource-group "${resourceGroup}" \
        --settings "${secretName}=${newSecret}"`,
    );

    newSecrets.push(`${secretName}=${newSecret}`);
    logger.success(`${secretName} rotated successfully`);
  }

  logger.blank();
  logger.box('🔐 NEW SECRETS', newSecrets);
  logger.blank();
  logger.warn('⚠️  Update your client applications with the new secret(s)');
}

async function rotateWebPubSubConnectionKey(
  resourceGroup: string,
): Promise<void> {
  const functionApps = await execJson<FunctionApp[]>(
    `az functionapp list --resource-group "${resourceGroup}"`,
  );

  if (functionApps.length === 0) {
    logger.error(
      `No Function Apps found in resource group "${resourceGroup}".`,
    );
    logger.info('Run the setup command first to create resources.');
    process.exit(1);
  }

  let functionAppName: string;
  if (functionApps.length === 1) {
    functionAppName = functionApps[0].name;
    logger.info(`Using Function App: ${functionAppName}`);
  } else {
    functionAppName = await select({
      message: 'Select Function App:',
      choices: functionApps.map((f) => ({
        name: `${f.name} (${f.location})`,
        value: f.name,
      })),
    });
  }

  // Find the Web PubSub resource from function app settings
  logger.blank();
  logger.info('Finding associated Web PubSub resource...');

  const settings = await execJson<AppSettings[]>(
    `az functionapp config appsettings list --name "${functionAppName}" --resource-group "${resourceGroup}"`,
  );

  const connectionStringSetting = settings.find(
    (s) => s.name === 'WEBPUBSUB_CONNECTION_STRING',
  );

  if (!connectionStringSetting) {
    logger.error(
      'No WEBPUBSUB_CONNECTION_STRING found in Function App settings.',
    );
    logger.info('Run the setup command first to configure Web PubSub.');
    process.exit(1);
  }

  // Extract Web PubSub name from connection string
  const match = connectionStringSetting.value.match(
    /Endpoint=https:\/\/([^.]+)\./,
  );
  if (!match) {
    logger.error('Could not parse Web PubSub name from connection string.');
    process.exit(1);
  }

  const webPubSubName = match[1];
  logger.info(`Found Web PubSub: ${webPubSubName}`);

  const keyChoice = await select({
    message: 'Which Web PubSub key to rotate?',
    choices: [
      { name: 'Primary Key', value: 'primary' },
      { name: 'Secondary Key', value: 'secondary' },
      { name: 'Both Keys (one at a time)', value: 'both' },
    ],
  });

  const keysToRotate =
    keyChoice === 'both' ? ['primary', 'secondary'] : [keyChoice];

  for (const keyType of keysToRotate) {
    logger.blank();
    logger.info(`Regenerating ${keyType} key...`);

    await exec(
      `az webpubsub key regenerate \
        --name "${webPubSubName}" \
        --resource-group "${resourceGroup}" \
        --key-type "${keyType}"`,
    );

    logger.success(
      `${keyType.charAt(0).toUpperCase() + keyType.slice(1)} key regenerated successfully`,
    );
  }

  // Get the new connection string (using primary key)
  logger.blank();
  logger.info('Fetching new connection string...');

  const keys = await execJson<WebPubSubKeys>(
    `az webpubsub key show --name "${webPubSubName}" --resource-group "${resourceGroup}"`,
  );

  // Update the function app with the new connection string (always use primary)
  await exec(
    `az functionapp config appsettings set \
      --name "${functionAppName}" \
      --resource-group "${resourceGroup}" \
      --settings "WEBPUBSUB_CONNECTION_STRING=${keys.primaryConnectionString}"`,
  );

  logger.blank();
  logger.success('✓ Web PubSub key(s) rotated and Function App updated');
  logger.blank();
  logger.info(
    'ℹ️  No client changes needed (connection managed by Function App)',
  );
}

export async function runRotate(): Promise<void> {
  logger.blank();
  logger.info('Rotating secrets for existing resources...');
  logger.blank();

  await ensureAzureCli();
  await ensureLoggedIn();
  await selectSubscription();

  const groups = await execJson<ResourceGroup[]>('az group list');

  const resourceGroup = await select({
    message: 'Select resource group:',
    choices: groups.map((g) => ({ name: g.name, value: g.name })),
  });

  const resourceType = await select({
    message: 'Which resource secrets do you want to rotate?',
    choices: [
      { name: 'Speech Service Keys', value: 'speech' },
      { name: 'Web PubSub Access Secrets', value: 'access' },
      { name: 'Web PubSub Technical Connection Key', value: 'connection' },
    ],
  });

  logger.blank();

  if (resourceType === 'speech') {
    await rotateSpeechServiceKeys(resourceGroup);
  } else if (resourceType === 'access') {
    await rotateWebPubSubAccessSecrets(resourceGroup);
  } else {
    await rotateWebPubSubConnectionKey(resourceGroup);
  }

  logger.blank();
}
