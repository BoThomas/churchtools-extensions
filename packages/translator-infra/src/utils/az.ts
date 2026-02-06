import { select, confirm, input } from '@inquirer/prompts';
import ora from 'ora';
import { exec, execJson } from './exec.ts';
import { logger } from './logger.ts';

interface AzAccount {
  id: string;
  name: string;
  isDefault: boolean;
}

interface AzResourceGroup {
  name: string;
  location: string;
}

export async function ensureAzureCli(): Promise<void> {
  const spinner = ora('Checking Azure CLI installation...').start();

  try {
    await exec('az --version');
    spinner.succeed('Azure CLI is installed');
  } catch {
    spinner.fail('Azure CLI is not installed');
    logger.blank();
    logger.info('Please install Azure CLI:');
    logger.info('');
    logger.info('  macOS:   brew install azure-cli');
    logger.info('  Windows: winget install Microsoft.AzureCLI');
    logger.info(
      '  Linux:   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash',
    );
    logger.info('');
    logger.info('Then run this command again.');
    process.exit(1);
  }
}

export async function ensureLoggedIn(): Promise<void> {
  const spinner = ora('Checking Azure login status...').start();

  try {
    await execJson<AzAccount>('az account show');
    spinner.succeed('Already logged in to Azure');
  } catch {
    spinner.warn('Not logged in to Azure');

    const shouldLogin = await confirm({
      message: 'Would you like to log in now?',
      default: true,
    });

    if (!shouldLogin) {
      logger.error('Azure login is required to continue.');
      process.exit(1);
    }

    logger.step('Opening browser for Azure login...');
    await exec('az login');
    logger.success('Successfully logged in to Azure');
  }
}

interface AzProvider {
  namespace: string;
  registrationState: string;
}

export async function selectSubscription(): Promise<string> {
  const accounts = await execJson<AzAccount[]>('az account list');

  if (accounts.length === 0) {
    logger.error('No Azure subscriptions found.');
    process.exit(1);
  }

  if (accounts.length === 1) {
    logger.info(`Using subscription: ${accounts[0].name}`);
    return accounts[0].id;
  }

  const subscriptionId = await select({
    message: 'Select Azure subscription:',
    choices: accounts.map((acc) => ({
      name: `${acc.name} (${acc.id})`,
      value: acc.id,
    })),
  });

  await exec(`az account set --subscription "${subscriptionId}"`);
  return subscriptionId;
}

export async function ensureProvidersRegistered(
  subscriptionId: string,
): Promise<void> {
  const requiredProviders = [
    'Microsoft.Storage',
    'Microsoft.Web',
    'Microsoft.SignalRService',
    'Microsoft.CognitiveServices',
  ];

  const spinner = ora('Checking resource providers...').start();

  try {
    const providers = await execJson<AzProvider[]>(
      `az provider list --subscription "${subscriptionId}"`,
    );

    const providerMap = new Map(
      providers.map((p) => [p.namespace, p.registrationState]),
    );

    const toRegister = requiredProviders.filter(
      (ns) => providerMap.get(ns) !== 'Registered',
    );

    if (toRegister.length === 0) {
      spinner.succeed('All required resource providers are registered');
      return;
    }

    spinner.stop();
    logger.blank();
    logger.warn(
      `The following resource providers need to be registered in your subscription:`,
    );
    toRegister.forEach((p) => logger.info(`  - ${p}`));
    logger.blank();

    const shouldRegister = await confirm({
      message: 'Register these providers now?',
      default: true,
    });

    if (!shouldRegister) {
      logger.error(
        'Resource providers are required to provision resources. Exiting.',
      );
      process.exit(1);
    }

    for (const provider of toRegister) {
      const providerSpinner = ora(`Registering ${provider}...`).start();
      await exec(
        `az provider register --namespace "${provider}" --subscription "${subscriptionId}" --wait`,
      );
      providerSpinner.succeed(`${provider} registered`);
    }
  } catch (error) {
    spinner.fail('Failed to check/register providers');
    throw error;
  }
}

export async function selectOrCreateResourceGroup(): Promise<{
  name: string;
  location: string;
  isNew: boolean;
}> {
  const useExisting = await select({
    message: 'Resource Group:',
    choices: [
      { name: 'Use existing resource group', value: 'existing' },
      { name: 'Create new resource group', value: 'new' },
    ],
  });

  if (useExisting === 'existing') {
    const groups = await execJson<AzResourceGroup[]>('az group list');

    if (groups.length === 0) {
      logger.warn('No existing resource groups found. Creating new one.');
      return createResourceGroup();
    }

    const name = await select({
      message: 'Select resource group:',
      choices: groups.map((g) => ({
        name: `${g.name} (${g.location})`,
        value: g.name,
      })),
    });

    const group = groups.find((g) => g.name === name)!;
    return { name: group.name, location: group.location, isNew: false };
  }

  return createResourceGroup();
}

async function createResourceGroup(): Promise<{
  name: string;
  location: string;
  isNew: boolean;
}> {
  const name = await input({
    message: 'Resource group name:',
    default: 'rg-churchtools-translator',
    validate: (v) =>
      /^[a-zA-Z0-9._-]+$/.test(v) || 'Invalid resource group name',
  });

  const location = await selectLocation();

  return { name, location, isNew: true };
}

interface AzLocation {
  name: string;
  displayName: string;
  regionalDisplayName: string;
}

export async function selectLocation(): Promise<string> {
  const spinner = ora('Fetching available Azure locations...').start();

  try {
    const allLocations = await execJson<AzLocation[]>(
      'az account list-locations',
    );
    spinner.stop();

    // Filter to commonly used locations or all if you want the full list
    // For better UX, we'll show locations that support most services
    const popularLocations = [
      'westeurope',
      'northeurope',
      'germanywestcentral',
      'uksouth',
      'eastus',
      'eastus2',
      'westus2',
      'centralus',
      'southcentralus',
      'westus3',
      'australiaeast',
      'southeastasia',
      'eastasia',
    ];

    const locations = allLocations
      .filter((loc) => popularLocations.includes(loc.name))
      .sort((a, b) => {
        // Sort by the order in popularLocations array
        return (
          popularLocations.indexOf(a.name) - popularLocations.indexOf(b.name)
        );
      })
      .map((loc) => ({
        name: loc.regionalDisplayName,
        value: loc.name,
      }));

    return select({
      message: 'Select location:',
      choices: locations,
    });
  } catch (error) {
    spinner.fail('Failed to fetch locations');
    throw error;
  }
}

export async function resourceExists(
  resourceGroup: string,
  resourceType: string,
  name: string,
  subscriptionId?: string,
): Promise<boolean> {
  try {
    const subParam = subscriptionId ? `--subscription "${subscriptionId}"` : '';
    await exec(
      `az resource show --resource-group "${resourceGroup}" --resource-type "${resourceType}" --name "${name}" ${subParam}`,
    );
    return true;
  } catch {
    return false;
  }
}

export async function resourceGroupExists(name: string): Promise<boolean> {
  try {
    await exec(`az group show --name "${name}"`);
    return true;
  } catch {
    return false;
  }
}

interface CorsSettings {
  allowedOrigins: string[];
}

/**
 * Fetch current CORS settings from a Function App
 */
async function getCurrentCorsSettings(
  functionAppName: string,
  resourceGroup: string,
  subscriptionId: string,
): Promise<string[]> {
  try {
    const result = await execJson<CorsSettings>(
      `az functionapp cors show \
        --name "${functionAppName}" \
        --resource-group "${resourceGroup}" \
        --subscription "${subscriptionId}"`,
    );
    return result.allowedOrigins || [];
  } catch {
    return [];
  }
}

/**
 * Prompt user for CORS origins and configure them on a Function App
 */
export async function configureFunctionAppCors(
  functionAppName: string,
  resourceGroup: string,
  subscriptionId: string,
  skipConfirmation: boolean = false,
): Promise<void> {
  logger.blank();
  logger.step('Configuring CORS for Function App...');
  logger.info(
    'CORS allows your ChurchTools extension to make requests to the Function App from browsers.',
  );
  logger.blank();

  // Only ask if they want to configure if skipConfirmation is false (initial setup)
  if (!skipConfirmation) {
    const shouldConfigure = await confirm({
      message: 'Would you like to configure CORS origins now?',
      default: true,
    });

    if (!shouldConfigure) {
      logger.info(
        'Skipping CORS configuration. You can configure it later by running setup again.',
      );
      return;
    }
  }

  // Fetch current CORS settings
  const spinner = ora('Fetching current CORS settings...').start();
  const currentOrigins = await getCurrentCorsSettings(
    functionAppName,
    resourceGroup,
    subscriptionId,
  );
  spinner.stop();

  logger.blank();
  if (currentOrigins.length > 0) {
    logger.info('Current CORS origins:');
    currentOrigins.forEach((origin) => logger.info(`  - ${origin}`));
  } else {
    logger.info('No CORS origins currently configured.');
  }
  logger.blank();

  // Start with current origins
  let origins = [...currentOrigins];

  // Allow user to remove origins if any exist
  if (currentOrigins.length > 0) {
    const shouldRemove = await confirm({
      message: 'Remove any existing origins?',
      default: false,
    });

    if (shouldRemove) {
      const { checkbox } = await import('@inquirer/prompts');
      const toRemove = await checkbox({
        message: 'Select origins to remove (use space to select):',
        choices: currentOrigins.map((origin) => ({
          name: origin,
          value: origin,
        })),
      });

      if (toRemove.length > 0) {
        origins = origins.filter((o) => !toRemove.includes(o));
        logger.blank();
        logger.info(`Marked ${toRemove.length} origin(s) for removal.`);
        logger.blank();
      }
    }
  }

  // Add new origins
  const shouldAdd = await confirm({
    message: 'Add new origins?',
    default: currentOrigins.length === 0,
  });

  if (shouldAdd) {
    logger.blank();
    logger.info(
      'Add origins (examples: http://localhost:5173, https://mytown.church.tools)',
    );
    logger.blank();

    let addMore = true;
    while (addMore) {
      const newOrigin = await input({
        message: 'Enter origin URL (or leave empty to finish):',
        default: origins.length === 0 ? 'http://localhost:5173' : '',
        validate: (v) => {
          if (!v.trim()) return true; // Allow empty to finish
          try {
            new URL(v);
            if (origins.includes(v.trim())) {
              return 'This origin is already in the list';
            }
            return true;
          } catch {
            return 'Invalid URL format';
          }
        },
      });

      if (newOrigin.trim()) {
        origins.push(newOrigin.trim());
        logger.info(`Added: ${newOrigin.trim()}`);
      } else {
        addMore = false;
      }
    }
  }

  // If no changes, exit
  const hasChanges =
    origins.length !== currentOrigins.length ||
    !origins.every((o) => currentOrigins.includes(o));

  if (!hasChanges) {
    logger.blank();
    logger.info('No changes to CORS configuration.');
    return;
  }

  // Show final configuration
  logger.blank();
  if (origins.length === 0) {
    logger.warn(
      'All origins will be removed. The function will not accept browser requests.',
    );
  } else {
    logger.info('New CORS configuration:');
    origins.forEach((origin) => logger.info(`  - ${origin}`));
  }
  logger.blank();

  const shouldProceed = await confirm({
    message: 'Apply these CORS settings?',
    default: true,
  });

  if (!shouldProceed) {
    logger.info('CORS configuration cancelled.');
    return;
  }

  const updateSpinner = ora('Updating CORS settings...').start();

  try {
    // Remove all existing origins first
    if (currentOrigins.length > 0) {
      const removeArg = currentOrigins.map((o) => `"${o}"`).join(' ');
      await exec(
        `az functionapp cors remove \
          --name "${functionAppName}" \
          --resource-group "${resourceGroup}" \
          --subscription "${subscriptionId}" \
          --allowed-origins ${removeArg}`,
      );
    }

    // Add new origins
    if (origins.length > 0) {
      const addArg = origins.map((o) => `"${o}"`).join(' ');
      await exec(
        `az functionapp cors add \
          --name "${functionAppName}" \
          --resource-group "${resourceGroup}" \
          --subscription "${subscriptionId}" \
          --allowed-origins ${addArg}`,
      );
    }

    updateSpinner.succeed('CORS settings updated successfully');
    logger.blank();
    logger.success(`✓ Configured ${origins.length} allowed origin(s)`);
  } catch (error: any) {
    updateSpinner.fail('Failed to update CORS settings');
    logger.error(error.message);
    logger.warn(
      'You can manually configure CORS in the Azure Portal or run this setup again.',
    );
  }
}
