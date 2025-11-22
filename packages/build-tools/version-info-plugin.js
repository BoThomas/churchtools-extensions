import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Vite plugin that generates extension version information
 * and injects it as a virtual module that can be imported in the app
 */
export function versionInfoPlugin() {
  const virtualModuleId = 'virtual:extension-info';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;

  return {
    name: 'churchtools-plugin-version-info',
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        // Read package.json from the extension directory (where vite is running)
        const packageJsonPath = path.join(process.cwd(), 'package.json');

        if (!fs.existsSync(packageJsonPath)) {
          console.error('Warning: package.json not found in current directory');
          return `export default { name: 'unknown', version: '0.0.0', gitHash: 'unknown', buildDate: '${new Date().toISOString()}' };`;
        }

        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, 'utf8'),
        );

        // Get git commit hash (short)
        let gitHash = 'unknown';
        let gitBranch = 'unknown';
        try {
          gitHash = execSync('git rev-parse --short HEAD', {
            encoding: 'utf8',
          }).trim();
          gitBranch = execSync('git rev-parse --abbrev-ref HEAD', {
            encoding: 'utf8',
          }).trim();
        } catch (error) {
          console.warn('Warning: Could not get git info');
        }

        const versionInfo = {
          name: packageJson.name,
          version: packageJson.version,
          description: packageJson.description || '',
          gitHash,
          gitBranch,
          buildDate: new Date().toISOString(),
        };

        return `export default ${JSON.stringify(versionInfo, null, 2)};`;
      }
    },
  };
}
