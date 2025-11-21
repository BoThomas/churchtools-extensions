#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Read package.json for project info
const packageJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'),
);
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

// Create releases directory
const releasesDir = path.join(rootDir, 'releases');
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
const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir)) {
  console.error(
    '❌ Error: dist directory not found. Run "npm run build" first.',
  );
  process.exit(1);
}

// Create zip archive
try {
  // Remove old archive if exists
  if (fs.existsSync(archivePath)) {
    fs.unlinkSync(archivePath);
    console.log('   Removed old archive');
  }

  // Create zip using system zip command (works on macOS/Linux)
  execSync(`cd "${distDir}" && zip -r "${archivePath}" .`, {
    stdio: 'inherit',
  });

  const stats = fs.statSync(archivePath);
  const fileSizeInKB = (stats.size / 1024).toFixed(2);

  console.log(`✅ Package created successfully!`);
  console.log(`   Location: ${archivePath}`);
  console.log(`   Size: ${fileSizeInKB} KB`);
} catch (error) {
  console.error('❌ Error creating package:', error.message);
  process.exit(1);
}
