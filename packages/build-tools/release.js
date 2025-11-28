#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const c = (color, text) => `${colors[color]}${text}${colors.reset}`;

// Find monorepo root
function findMonorepoRoot() {
  let currentDir = process.cwd();
  while (currentDir !== path.parse(currentDir).root) {
    if (fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  throw new Error('Could not find monorepo root (pnpm-workspace.yaml)');
}

// Get git remote origin URL and extract owner/repo
function getGitHubInfo(monorepoRoot) {
  try {
    const remoteUrl = execSync('git remote get-url origin', {
      cwd: monorepoRoot,
      encoding: 'utf8',
    }).trim();

    // Handle SSH format: git@github.com:owner/repo.git
    // Handle HTTPS format: https://github.com/owner/repo.git
    const sshMatch = remoteUrl.match(/git@github\.com:(.+?)\/(.+?)(?:\.git)?$/);
    const httpsMatch = remoteUrl.match(
      /https:\/\/github\.com\/(.+?)\/(.+?)(?:\.git)?$/,
    );

    const match = sshMatch || httpsMatch;
    if (match) {
      return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
    }
  } catch (error) {
    // Ignore
  }
  return null;
}

// Discover all extensions
function discoverExtensions(monorepoRoot) {
  const extensionsDir = path.join(monorepoRoot, 'extensions');
  const extensions = [];

  if (!fs.existsSync(extensionsDir)) {
    return extensions;
  }

  const entries = fs.readdirSync(extensionsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const pkgPath = path.join(extensionsDir, entry.name, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        extensions.push({
          dirName: entry.name,
          name: pkg.name,
          version: pkg.version,
          path: path.join(extensionsDir, entry.name),
          relativePath: `extensions/${entry.name}`,
        });
      }
    }
  }

  return extensions;
}

// Get previous tag for a package
function getPreviousTag(packageName) {
  try {
    const tags = execSync(`git tag -l "${packageName}@*" --sort=-v:refname`, {
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .filter(Boolean);

    return tags.length > 0 ? tags[0] : null;
  } catch (error) {
    return null;
  }
}

// Get commits since a tag (or all commits) scoped to a path
function getCommitsSince(tag, relativePath) {
  try {
    const range = tag ? `${tag}..HEAD` : 'HEAD';
    const commits = execSync(
      `git log ${range} --oneline --no-merges -- "${relativePath}"`,
      { encoding: 'utf8' },
    )
      .trim()
      .split('\n')
      .filter(Boolean);
    return commits;
  } catch (error) {
    return [];
  }
}

// Parse semver version
function parseSemver(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid semver version: ${version}`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

// Bump version
function bumpVersion(version, bump) {
  const { major, minor, patch } = parseSemver(version);
  switch (bump) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Invalid bump type: ${bump}`);
  }
}

// Create readline interface for prompts
function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

// Prompt for input
async function prompt(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Multi-select prompt
async function multiSelect(rl, items, labelFn) {
  const selected = new Set();

  console.log(c('cyan', '\n📦 Select extensions to release:'));
  console.log(c('dim', '   (Enter numbers separated by spaces, or "all")'));
  console.log('');

  items.forEach((item, index) => {
    console.log(`   ${c('yellow', `[${index + 1}]`)} ${labelFn(item)}`);
  });

  console.log('');
  const answer = await prompt(rl, c('cyan', '→ Your selection: '));

  if (answer.toLowerCase() === 'all') {
    return items;
  }

  const indices = answer
    .split(/[\s,]+/)
    .map((s) => parseInt(s.trim(), 10) - 1)
    .filter((i) => i >= 0 && i < items.length);

  return indices.map((i) => items[i]);
}

// Select single option
async function selectOption(rl, question, options) {
  console.log(c('cyan', `\n${question}`));
  options.forEach((opt, index) => {
    console.log(`   ${c('yellow', `[${index + 1}]`)} ${opt}`);
  });

  const answer = await prompt(rl, c('cyan', '→ Your choice: '));
  const index = parseInt(answer, 10) - 1;

  if (index >= 0 && index < options.length) {
    return options[index];
  }

  // Default to first option
  return options[0];
}

// Generate changelog entry
function generateChangelogEntry(
  packageName,
  version,
  summary,
  commits,
  previousTag,
  githubInfo,
) {
  const date = new Date().toISOString().split('T')[0];
  const tag = `${packageName}@${version}`;

  let entry = `## ${packageName} v${version} — ${date}\n\n`;

  if (summary) {
    entry += `${summary}\n\n`;
  }

  if (commits.length > 0) {
    entry += `### Changes\n\n`;
    commits.forEach((commit) => {
      entry += `- ${commit}\n`;
    });
    entry += '\n';
  }

  if (githubInfo && previousTag) {
    entry += `**Full Changelog**: https://github.com/${githubInfo.owner}/${githubInfo.repo}/compare/${previousTag}...${tag}\n`;
  } else if (githubInfo) {
    entry += `**Full Changelog**: https://github.com/${githubInfo.owner}/${githubInfo.repo}/commits/${tag}\n`;
  }

  return entry;
}

// Update or create CHANGELOG.md
function updateChangelog(extensionPath, entry) {
  const changelogPath = path.join(extensionPath, 'CHANGELOG.md');

  let content = '';
  if (fs.existsSync(changelogPath)) {
    content = fs.readFileSync(changelogPath, 'utf8');
  } else {
    content = '# Changelog\n\nAll notable changes to this extension will be documented in this file.\n\n';
  }

  // Insert new entry after the header
  const headerEndIndex = content.indexOf('\n\n', content.indexOf('# Changelog'));
  if (headerEndIndex !== -1) {
    const insertPosition = content.indexOf('\n\n', headerEndIndex + 2);
    if (insertPosition !== -1 && content.substring(insertPosition + 2, insertPosition + 5) === '## ') {
      // There are existing entries, insert before them
      content =
        content.substring(0, insertPosition + 2) +
        entry +
        '\n---\n\n' +
        content.substring(insertPosition + 2);
    } else {
      // No existing entries, append after header
      content = content.substring(0, headerEndIndex + 2) + '\n' + entry;
    }
  } else {
    // No header found, just append
    content += '\n' + entry;
  }

  fs.writeFileSync(changelogPath, content);
  return changelogPath;
}

// Find the release ZIP for a package
function findReleaseZip(monorepoRoot, packageName, version) {
  const releasesDir = path.join(monorepoRoot, 'releases');

  if (!fs.existsSync(releasesDir)) {
    return null;
  }

  const files = fs.readdirSync(releasesDir);
  const pattern = new RegExp(
    `^${packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-v${version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-[a-f0-9]+\\.zip$`,
  );

  const matches = files.filter((f) => pattern.test(f));

  if (matches.length === 0) {
    return null;
  }

  // Get the newest one by modification time
  const withStats = matches.map((f) => ({
    name: f,
    path: path.join(releasesDir, f),
    mtime: fs.statSync(path.join(releasesDir, f)).mtime,
  }));

  withStats.sort((a, b) => b.mtime - a.mtime);
  return withStats[0].path;
}

// Check if gh CLI is available
function isGhAvailable() {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Create GitHub release
function createGitHubRelease(tag, title, notes, zipPath) {
  const args = ['release', 'create', tag, '--title', title, '--notes', notes];

  if (zipPath) {
    args.push(zipPath);
  }

  const result = spawnSync('gh', args, {
    stdio: 'inherit',
    encoding: 'utf8',
  });

  return result.status === 0;
}

// Main release function
async function main() {
  console.log(c('bold', '\n🚀 ChurchTools Extensions Release Tool\n'));

  const monorepoRoot = findMonorepoRoot();
  const githubInfo = getGitHubInfo(monorepoRoot);

  if (githubInfo) {
    console.log(
      c('dim', `   Repository: ${githubInfo.owner}/${githubInfo.repo}`),
    );
  }

  // Discover extensions
  const extensions = discoverExtensions(monorepoRoot);

  if (extensions.length === 0) {
    console.log(c('red', '❌ No extensions found in extensions/ directory'));
    process.exit(1);
  }

  const rl = createPrompt();

  try {
    // Multi-select extensions
    const selectedExtensions = await multiSelect(rl, extensions, (ext) =>
      `${ext.name} ${c('dim', `(v${ext.version})`)}`,
    );

    if (selectedExtensions.length === 0) {
      console.log(c('yellow', '\n⚠️  No extensions selected. Exiting.'));
      rl.close();
      return;
    }

    const releasedPackages = [];

    // Process each selected extension
    for (const ext of selectedExtensions) {
      console.log(c('bold', `\n${'─'.repeat(60)}`));
      console.log(c('bold', `📦 Releasing: ${c('cyan', ext.name)}`));
      console.log(c('bold', `${'─'.repeat(60)}`));

      // Get previous tag and commits
      const previousTag = getPreviousTag(ext.name);
      const commits = getCommitsSince(previousTag, ext.relativePath);

      if (previousTag) {
        console.log(c('dim', `\n   Previous release: ${previousTag}`));
      } else {
        console.log(c('dim', '\n   No previous releases found'));
      }

      // Show commits
      if (commits.length > 0) {
        console.log(c('green', `\n   ${commits.length} commit(s) since last release:`));
        commits.slice(0, 10).forEach((commit) => {
          console.log(c('dim', `      • ${commit}`));
        });
        if (commits.length > 10) {
          console.log(c('dim', `      ... and ${commits.length - 10} more`));
        }
      } else {
        console.log(c('yellow', '\n   ⚠️  No commits since last release'));
      }

      // Prompt for semver bump
      const bumpType = await selectOption(
        rl,
        `Version bump for ${ext.name} (current: v${ext.version}):`,
        ['patch', 'minor', 'major'],
      );

      const newVersion = bumpVersion(ext.version, bumpType);
      console.log(c('green', `\n   New version: v${newVersion}`));

      // Prompt for summary
      console.log('');
      const summary = await prompt(
        rl,
        c('cyan', '   Release summary (one line, or empty): '),
      );

      // Update package.json version
      const pkgPath = path.join(ext.path, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      pkg.version = newVersion;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log(c('green', '\n   ✓ Updated package.json version'));

      // Git commit
      const commitMessage = `chore(${ext.dirName}): release v${newVersion}`;
      execSync(`git add "${pkgPath}"`, { cwd: monorepoRoot });
      execSync(`git commit -m "${commitMessage}"`, { cwd: monorepoRoot });
      console.log(c('green', `   ✓ Committed: ${commitMessage}`));

      // Create annotated tag
      const tag = `${ext.name}@${newVersion}`;
      execSync(`git tag -a "${tag}" -m "Release ${ext.name} v${newVersion}"`, {
        cwd: monorepoRoot,
      });
      console.log(c('green', `   ✓ Created tag: ${tag}`));

      // Run deploy (build + package)
      console.log(c('cyan', '\n   Building and packaging...'));
      try {
        execSync(`pnpm turbo deploy --filter=${ext.name}`, {
          cwd: monorepoRoot,
          stdio: 'inherit',
        });
        console.log(c('green', '   ✓ Deploy completed'));
      } catch (error) {
        console.log(c('red', '   ✗ Deploy failed'));
        throw error;
      }

      // Generate changelog entry
      const changelogEntry = generateChangelogEntry(
        ext.name,
        newVersion,
        summary,
        commits,
        previousTag,
        githubInfo,
      );

      // Update changelog
      const changelogPath = updateChangelog(ext.path, changelogEntry);
      execSync(`git add "${changelogPath}"`, { cwd: monorepoRoot });
      execSync(`git commit --amend --no-edit`, { cwd: monorepoRoot });
      // Update the tag to point to the amended commit
      execSync(`git tag -d "${tag}"`, { cwd: monorepoRoot, stdio: 'ignore' });
      execSync(`git tag -a "${tag}" -m "Release ${ext.name} v${newVersion}"`, {
        cwd: monorepoRoot,
      });
      console.log(c('green', `   ✓ Updated CHANGELOG.md`));

      releasedPackages.push({
        ext,
        newVersion,
        tag,
        changelogEntry,
        zipPath: findReleaseZip(monorepoRoot, ext.name, newVersion),
      });
    }

    // Ask about GitHub release
    console.log(c('bold', `\n${'─'.repeat(60)}`));

    const ghAvailable = isGhAvailable();

    if (!ghAvailable) {
      console.log(
        c('yellow', '\n⚠️  GitHub CLI (gh) not found. Skipping GitHub releases.'),
      );
      console.log(c('dim', '   Install it with: brew install gh'));
    } else {
      const releaseChoice = await selectOption(
        rl,
        'Create GitHub releases?',
        ['Yes, create GitHub releases', 'No, local-only'],
      );

      if (releaseChoice.startsWith('Yes')) {
        for (const released of releasedPackages) {
          console.log(
            c('cyan', `\n   Creating GitHub release for ${released.tag}...`),
          );

          const title = `${released.ext.name} v${released.newVersion}`;
          const success = createGitHubRelease(
            released.tag,
            title,
            released.changelogEntry,
            released.zipPath,
          );

          if (success) {
            console.log(c('green', `   ✓ GitHub release created: ${released.tag}`));
          } else {
            console.log(c('red', `   ✗ Failed to create GitHub release`));
          }
        }
      }
    }

    // Ask about pushing
    console.log('');
    const pushChoice = await selectOption(rl, 'Push commits and tags to remote?', [
      'Yes, push now',
      'No, I\'ll push later',
    ]);

    if (pushChoice.startsWith('Yes')) {
      console.log(c('cyan', '\n   Pushing commits and tags...'));
      try {
        execSync('git push', { cwd: monorepoRoot, stdio: 'inherit' });
        execSync('git push --tags', { cwd: monorepoRoot, stdio: 'inherit' });
        console.log(c('green', '   ✓ Pushed successfully'));
      } catch (error) {
        console.log(c('red', '   ✗ Push failed'));
      }
    }

    // Summary
    console.log(c('bold', `\n${'─'.repeat(60)}`));
    console.log(c('bold', c('green', '✅ Release complete!')));
    console.log('');
    console.log(c('cyan', '   Released packages:'));
    releasedPackages.forEach((r) => {
      console.log(`      • ${r.ext.name} ${c('green', `v${r.newVersion}`)}`);
      if (r.zipPath) {
        console.log(c('dim', `        ZIP: ${path.basename(r.zipPath)}`));
      }
    });

    if (pushChoice.startsWith('No')) {
      console.log(c('yellow', '\n   Remember to push when ready:'));
      console.log(c('dim', '      git push && git push --tags'));
    }

    console.log('');
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(c('red', `\n❌ Error: ${error.message}`));
  process.exit(1);
});
