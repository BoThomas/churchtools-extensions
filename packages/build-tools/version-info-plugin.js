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

        // Extract repository URL
        let repositoryUrl = '';
        if (packageJson.repository) {
          if (typeof packageJson.repository === 'string') {
            repositoryUrl = packageJson.repository;
          } else if (packageJson.repository.url) {
            repositoryUrl = packageJson.repository.url
              .replace(/^git\+/, '')
              .replace(/\.git$/, '');
          }
        }

        // Extract author information
        let authorName = '';
        let authorEmail = '';
        if (packageJson.author) {
          if (typeof packageJson.author === 'string') {
            // Parse "Name <email>" format
            const match = packageJson.author.match(/^([^<]+)(?:<([^>]+)>)?/);
            if (match) {
              authorName = match[1].trim();
              authorEmail = match[2]?.trim() || '';
            }
          } else {
            authorName = packageJson.author.name || '';
            authorEmail = packageJson.author.email || '';
          }
        }

        const versionInfo = {
          name: packageJson.name,
          version: packageJson.version,
          description: packageJson.description || '',
          gitHash,
          gitBranch,
          buildDate: new Date().toISOString(),
          repositoryUrl,
          authorName,
          authorEmail,
        };

        return `export default ${JSON.stringify(versionInfo, null, 2)};`;
      }
    },
  };
}
