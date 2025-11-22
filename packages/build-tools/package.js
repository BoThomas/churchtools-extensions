#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the extension directory (where the script is called from)
const extensionDir = process.cwd();

// Read package.json for project info from the extension directory
const packageJsonPath = path.join(extensionDir, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Error: package.json not found in current directory');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const projectName = packageJson.name;
const version = packageJson.version;

// Get git commit hash (short)
let gitHash = '';
try {
  gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch (error) {
  console.warn('Warning: Could not get git hash, using timestamp');
  gitHash = Date.now().toString(36);
}

// Find the monorepo root by looking for pnpm-workspace.yaml
let monorepoRoot = extensionDir;
let currentDir = extensionDir;
while (currentDir !== path.parse(currentDir).root) {
  if (fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
    monorepoRoot = currentDir;
    break;
  }
  currentDir = path.dirname(currentDir);
}

// Create releases directory at monorepo root
const releasesDir = path.join(monorepoRoot, 'releases');
if (!fs.existsSync(releasesDir)) {
  fs.mkdirSync(releasesDir, { recursive: true });
}

// Define archive name
const archiveName = `${projectName}-v${version}-${gitHash}.zip`;
const archivePath = path.join(releasesDir, archiveName);

console.log('📦 Creating ChurchTools extension package...');
console.log(`   Project: ${projectName}`);
console.log(`   Version: ${version}`);
console.log(`   Git Hash: ${gitHash}`);
console.log(`   Archive: ${archiveName}`);

// Check if dist directory exists
const distDir = path.join(extensionDir, 'dist');
if (!fs.existsSync(distDir)) {
  console.error(
    '❌ Error: dist directory not found. Run "pnpm build" or "npm run build" first.',
  );
  process.exit(1);
}

try {
  // Remove old archive if exists
  if (fs.existsSync(archivePath)) {
    fs.unlinkSync(archivePath);
    console.log('   Removed old archive');
  }

  // Create ZIP archive using system zip command
  execSync(`cd "${distDir}" && zip -r "${archivePath}" .`, {
    stdio: 'inherit',
  });

  console.log('✅ Package created successfully!');
  console.log(`📁 Location: ${archivePath}`);
  console.log('');
  console.log('🚀 Next steps:');
  console.log('   1. Upload the ZIP file to your ChurchTools instance');
  console.log('   2. Go to Admin → Extensions → Upload Extension');
  console.log('   3. Select the ZIP file and install');
  console.log('');

  // Show file size
  const stats = fs.statSync(archivePath);
  const fileSizeInKB = (stats.size / 1024).toFixed(2);
  const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

  if (stats.size > 1024 * 1024) {
    console.log(`📊 Package size: ${fileSizeInMB} MB`);
  } else {
    console.log(`📊 Package size: ${fileSizeInKB} KB`);
  }
} catch (error) {
  console.error('❌ Error creating package:', error.message);
  process.exit(1);
}
