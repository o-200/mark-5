import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

function findTestFiles(dir: string): string[] {
  try {
    const entries = readdirSync(dir, { recursive: true });
    return entries
      .map(String)
      .filter((file) => file.endsWith('.test.ts') || file.endsWith('.test.js'))
      .map((file) => join(dir, file));
  } catch {
    return [];
  }
}

const args = process.argv.slice(2);
const explicitFiles = args.filter((arg) => !arg.startsWith('-'));
const flags = args.filter((arg) => arg.startsWith('-'));

const filesToRun = explicitFiles.length > 0 ? explicitFiles : findTestFiles('tests');

if (filesToRun.length === 0) {
  console.error('No test files found to execute.');
  process.exit(1);
}

const child = spawnSync(
  process.execPath,
  ['--import', 'tsx', '--test', ...flags, ...filesToRun],
  { stdio: 'inherit' }
);

process.exit(child.status ?? 1);
