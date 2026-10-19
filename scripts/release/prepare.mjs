#!/usr/bin/env node
// Prepares a release from the [Unreleased] section of CHANGELOG.md: picks the next version, bumps
// it in every package and in app.config.ts (plus android.versionCode), and moves the [Unreleased]
// entries under a new version heading. Writes `tag=vX.Y.Z` (empty when there is nothing to
// release) to $GITHUB_OUTPUT. Committing, tagging and building happen in the workflow.
//
// Usage: node scripts/release/prepare.mjs [--bump auto|patch|minor|major] [--date YYYY-MM-DD] [--dry-run]
//   auto: minor when [Unreleased] has an Added, Changed, Removed or Deprecated section, else patch.
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PACKAGES = ['package.json', 'packages/core/package.json', 'apps/mobile/package.json'];
const APP_CONFIG = 'apps/mobile/app.config.ts';
const CHANGELOG = 'CHANGELOG.md';
const MINOR_SECTIONS = /^### (Added|Changed|Removed|Deprecated)\b/m;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

function output(tag) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `tag=${tag}\n`);
}

const read = (file) => readFileSync(join(root, file), 'utf8');
const dryRun = process.argv.includes('--dry-run');
const write = (file, text) => {
  if (!dryRun) writeFileSync(join(root, file), text);
};

/** Replaces exactly one match of `pattern`; a missing or repeated match means the file changed shape. */
function replaceOnce(text, pattern, replacement, file) {
  const matches = text.match(new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`));
  if (matches?.length !== 1) fail(`${file}: expected one match for ${pattern}, found ${matches?.length ?? 0}`);
  return text.replace(pattern, replacement);
}

const bump = arg('bump', 'auto');
if (!['auto', 'patch', 'minor', 'major'].includes(bump)) fail(`unknown --bump "${bump}"`);
const date = arg('date', new Date().toISOString().slice(0, 10));

const changelog = read(CHANGELOG);
const unreleased = changelog.match(/^## \[Unreleased\]\n([\s\S]*?)(?=^## \[|(?![\s\S]))/m);
if (!unreleased) fail(`${CHANGELOG}: no "## [Unreleased]" heading`);
const entries = unreleased[1].trim();
if (!entries) {
  console.log('[Unreleased] in CHANGELOG.md is empty, nothing to release.');
  output('');
  process.exit(0);
}

const current = JSON.parse(read(PACKAGES[0])).version;
for (const file of PACKAGES.slice(1)) {
  const v = JSON.parse(read(file)).version;
  if (v !== current) fail(`${file} has version ${v}, ${PACKAGES[0]} has ${current}`);
}
const appConfig = read(APP_CONFIG);
const appVersion = appConfig.match(/^\s*version: '([^']+)',/m)?.[1];
if (appVersion !== current) fail(`${APP_CONFIG} has version ${appVersion}, ${PACKAGES[0]} has ${current}`);

const [major, minor, patch] = current.split('.').map(Number);
const level = bump === 'auto' ? (MINOR_SECTIONS.test(entries) ? 'minor' : 'patch') : bump;
const next =
  level === 'major' ? `${major + 1}.0.0` : level === 'minor' ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;
const nextMajor = Number(next.split('.')[0]);

for (const file of PACKAGES) {
  write(file, replaceOnce(read(file), /"version": "[^"]+"/, `"version": "${next}"`, file));
}
const versionCode = Number(appConfig.match(/versionCode: (\d+),/)?.[1]);
if (!Number.isInteger(versionCode)) fail(`${APP_CONFIG}: no android versionCode`);
let config = replaceOnce(appConfig, /^(\s*)version: '[^']+',/m, `$1version: '${next}',`, APP_CONFIG);
config = replaceOnce(config, /versionCode: \d+,/, `versionCode: ${versionCode + 1},`, APP_CONFIG);
write(APP_CONFIG, config);

const heading = `## [${next}] - ${date}${nextMajor === 0 ? ' (Beta)' : ''}`;
write(CHANGELOG, replaceOnce(changelog, /^## \[Unreleased\]\n/m, `## [Unreleased]\n\n${heading}\n`, CHANGELOG));

console.log(
  `Release v${next} (${level} from ${current}), versionCode ${versionCode} -> ${versionCode + 1}${dryRun ? ', dry run: no files written' : ''}.`,
);
output(`v${next}`);
