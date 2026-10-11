#!/usr/bin/env node
/**
 * Starts Next.js on the port declared in the environment file.
 *
 * Why this exists: Next.js decides which port to listen on *before* it loads
 * `.env*`, so a `PORT` entry in `.env.local` is ignored by a bare `next dev`
 * (it silently falls back to 3000). This wrapper reads the env file first and
 * passes the port through, which keeps every port in exactly one place.
 *
 * Usage:  node scripts/next-env-port.mjs <next-command> [next args...]
 *   e.g.  node scripts/next-env-port.mjs dev
 *         node scripts/next-env-port.mjs start
 *
 * Env:
 *   ENV_FILE  name of the env file to read (default: .env.local)
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const envFile = process.env.ENV_FILE || '.env.local';
const envPath = resolve(root, envFile);
const args = process.argv.slice(2);
const [command, ...nextArgs] = args;

/** Minimal dotenv parser — handles `KEY=value`, quotes and `#` comments. */
function parseEnvFile(contents) {
  const vars = {};

  // Windows editors often prepend a UTF-8 BOM; strip it so the first key
  // is not silently parsed as "﻿PORT".
  const text = contents.replace(/^\uFEFF/, '');

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted) value = value.slice(1, -1);

    vars[key] = value;
  }

  return vars;
}

const fileVars = existsSync(envPath)
  ? parseEnvFile(readFileSync(envPath, 'utf8'))
  : {};

// An explicit `-p/--port` flag still wins, so one-off runs keep working.
const portFlagIndex = nextArgs.findIndex(
  (arg) => arg === '-p' || arg === '--port'
);
const portFromFlag =
  portFlagIndex !== -1 ? nextArgs[portFlagIndex + 1] : undefined;

const port = portFromFlag || process.env.PORT || fileVars.PORT;

if (!port) {
  console.error(
    `[next-env-port] No port configured.\n` +
      `                  Looked for PORT in the process environment and in ${envFile}.\n` +
      `                  If ${envFile} does not exist yet, run:\n` +
      `                      cp .env.example ${envFile}\n` +
      `                  then set PORT=<your port> in that file.`
  );
  process.exit(1);
}

/**
 * `NEXT_PUBLIC_ROOT_DOMAIN` cannot reuse PORT automatically: browsers resolve
 * `*.localhost` to loopback but read the port from the hostname, so a mismatch
 * silently sends tenants to the wrong port. Warn when they drift apart.
 */
const rootDomain = fileVars.NEXT_PUBLIC_ROOT_DOMAIN;
const expectedSuffix = `:${port}`;

if (
  !portFromFlag &&
  rootDomain &&
  rootDomain.includes(':') &&
  !rootDomain.endsWith(expectedSuffix)
) {
  console.warn(
    `[next-env-port] PORT is ${port} but NEXT_PUBLIC_ROOT_DOMAIN is ` +
      `"${rootDomain}" — tenant links would point at the wrong port. ` +
      `Make it end with "${expectedSuffix}".`
  );
}

const nextBin = join(root, 'node_modules', 'next', 'dist', 'bin', 'next');

if (!existsSync(nextBin)) {
  console.error(
    `[next-env-port] Could not find ${nextBin}. Run \`pnpm install\` first.`
  );
  process.exit(1);
}

console.log(`[next-env-port] ${envFile} → PORT=${port}`);

const child = spawn(process.execPath, [nextBin, command, ...nextArgs], {
  stdio: 'inherit',
  env: { ...process.env, ...fileVars, PORT: String(port) }
});

child.on('exit', (code, signal) => {
  // Propagate the child's exit code, and re-raise the signal if it was killed
  // so Ctrl+C and SIGTERM behave the same as running Next.js directly.
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(`[next-env-port] Failed to start Next.js: ${error.message}`);
  process.exit(1);
});