import ora from 'ora';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from './exec.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function deployFunctionApp(
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
