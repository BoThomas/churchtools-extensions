#!/usr/bin/env node --experimental-strip-types

import { runSetup } from './commands/setup.ts';
import { runSecrets } from './commands/secrets.ts';
import { runRotate } from './commands/rotate.ts';
import { logger } from './utils/logger.ts';

const command = process.argv[2];

async function main() {
  switch (command) {
    case 'setup':
      await runSetup();
      break;
    case 'secrets':
      await runSecrets();
      break;
    case 'rotate':
      await runRotate();
      break;
    default:
      logger.info('Usage: pnpm run <command>');
      logger.info('');
      logger.info('Commands:');
      logger.info('  setup    - Provision Azure resources interactively');
      logger.info(
        '  secrets  - Re-fetch and display secrets for existing resources',
      );
      logger.info('  rotate   - Rotate secrets for existing resources');
      process.exit(1);
  }
}

main().catch((err) => {
  logger.error(err.message);
  process.exit(1);
});
