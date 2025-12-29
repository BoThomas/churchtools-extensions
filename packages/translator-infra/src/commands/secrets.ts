import { input, select } from '@inquirer/prompts';
import {
  ensureAzureCli,
  ensureLoggedIn,
  selectSubscription,
} from '../utils/az.ts';
import { execJson, exec } from '../utils/exec.ts';
import { logger } from '../utils/logger.ts';

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

export async function runSecrets(): Promise<void> {
  logger.blank();
  logger.info('Fetching secrets for existing resources...');
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
    message: 'Which resource secrets do you need?',
    choices: [
      { name: 'Speech Service', value: 'speech' },
      { name: 'Web PubSub / Function App', value: 'webpubsub' },
    ],
  });

  const secrets: string[] = [];

  if (resourceType === 'speech') {
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

    const name = await select({
      message: 'Select Speech Service:',
      choices: services.map((s) => ({
        name: `${s.name} (${s.location})`,
        value: s.name,
      })),
    });

    const keys = await execJson<SpeechServiceKeys>(
      `az cognitiveservices account keys list --name "${name}" --resource-group "${resourceGroup}"`,
    );

    const service = services.find((s) => s.name === name)!;

    secrets.push(
      `SPEECH_KEY=${keys.key1}`,
      `SPEECH_REGION=${service.location}`,
      `SPEECH_ENDPOINT=${service.properties.endpoint}`,
    );
  } else {
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

    const functionAppName = await select({
      message: 'Select Function App:',
      choices: functionApps.map((f) => ({
        name: `${f.name} (${f.location})`,
        value: f.name,
      })),
    });

    const settings = await execJson<AppSettings[]>(
      `az functionapp config appsettings list --name "${functionAppName}" --resource-group "${resourceGroup}"`,
    );

    const operatorSecret = settings.find((s) => s.name === 'OPERATOR_SECRET');
    const readerSecret = settings.find((s) => s.name === 'READER_SECRET');

    if (operatorSecret) secrets.push(`OPERATOR_SECRET=${operatorSecret.value}`);
    if (readerSecret) secrets.push(`READER_SECRET=${readerSecret.value}`);

    // Get actual function app hostname
    const result = await exec(
      `az functionapp show \
        --name "${functionAppName}" \
        --resource-group "${resourceGroup}" \
        --query properties.defaultHostName \
        --output tsv`,
    );
    const defaultHostName = result.stdout.trim();

    secrets.push(
      `WEBPUBSUB_ACCESS_FUNCTION_URL=https://${defaultHostName}/api/webpubsub-access`,
    );
  }

  logger.blank();
  logger.box('🔐 SECRETS', secrets);
}
