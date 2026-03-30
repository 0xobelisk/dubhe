#!/usr/bin/env node

import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { setTimeout as setTimeoutCb } from 'timers';

const setTimeoutAsync = promisify(setTimeoutCb);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, '..');
const port = Number(process.env.WORKBENCH_SMOKE_PORT || 4273);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function requestJson(baseUrl, pathname, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, init);
  let json = {};
  try {
    json = await response.json();
  } catch {
    // ignore parse error for diagnostics
  }
  return { response, json };
}

function writeFile(filePath, content, mode = undefined) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
  if (typeof mode === 'number') {
    fs.chmodSync(filePath, mode);
  }
}

function createTraceZst(rawPath, zstPath) {
  const child = spawn('zstd', ['-f', '-q', rawPath, '-o', zstPath], {
    stdio: 'pipe'
  });

  return new Promise((resolve, reject) => {
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf-8');
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`zstd failed (exit=${code}): ${stderr}`));
    });
    child.on('error', reject);
  });
}

async function createFixture() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dubhe-workbench-smoke-'));
  const contractsDir = path.join(tmpRoot, 'contracts');
  const traceDir = path.join(contractsDir, 'src', 'counter', 'traces');
  const scriptsDir = path.join(contractsDir, 'scripts');

  fs.mkdirSync(traceDir, { recursive: true });
  fs.mkdirSync(scriptsDir, { recursive: true });

  const packageJson = {
    name: 'smoke-contracts',
    private: true,
    version: '1.0.0',
    scripts: {
      'debug:collect:once':
        "node -e \"const fs=require('fs');fs.mkdirSync('.reports/move',{recursive:true});fs.writeFileSync('.reports/move/debug-session.json',JSON.stringify({generatedAt:new Date().toISOString(),failedTests:[],hints:[],sourceHints:[]},null,2));console.log('collect-ok');\"",
      'debug:open': "node -e \"console.log('debug-open-ok');\""
    }
  };
  writeFile(path.join(contractsDir, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);

  const helperScript = `#!/usr/bin/env bash
set -euo pipefail
if [[ \"$*\" == *\"--sleep\"* ]]; then
  sleep 2
fi
echo \"helper:$*\"\n`;
  writeFile(path.join(scriptsDir, 'dubhe-local.sh'), helperScript, 0o755);

  const traceAPath = path.join(traceDir, 'trace-a.json');
  const traceBPath = path.join(traceDir, 'trace-b.json');

  const traceALines = [
    JSON.stringify({ OpenFrame: { frame: { frame_id: 1, function_name: 'inc', module: { name: 'counter' } } } }),
    JSON.stringify({ Instruction: { instruction: 'ADD', pc: 1, gas_left: 9000 } }),
    JSON.stringify({ Effect: { Write: { location: { Local: [1, 0] }, root_value_after_write: { RuntimeValue: { value: 1 } } } } }),
    JSON.stringify({ CloseFrame: { frame_id: 1 } })
  ].join('\n');

  const traceBLines = [
    JSON.stringify({ OpenFrame: { frame: { frame_id: 1, function_name: 'inc', module: { name: 'counter' } } } }),
    JSON.stringify({ Instruction: { instruction: 'ADD', pc: 1, gas_left: 8800 } }),
    JSON.stringify({ Effect: { Write: { location: { Local: [1, 0] }, root_value_after_write: { RuntimeValue: { value: 2 } } } } }),
    JSON.stringify({ Instruction: { instruction: 'SUB', pc: 2, gas_left: 8600 } }),
    JSON.stringify({ Effect: { Read: { location: { Local: [1, 0] }, root_value_read: { RuntimeValue: { value: 2 } } } } }),
    JSON.stringify({ CloseFrame: { frame_id: 1 } })
  ].join('\n');

  writeFile(traceAPath, `${traceALines}\n`);
  writeFile(traceBPath, `${traceBLines}\n`);

  const traceAZst = `${traceAPath}.zst`;
  const traceBZst = `${traceBPath}.zst`;
  await createTraceZst(traceAPath, traceAZst);
  await createTraceZst(traceBPath, traceBZst);

  return {
    tmpRoot,
    contractsDir,
    traceAZst,
    traceBZst
  };
}

async function waitForServer(baseUrl, contractsDir) {
  const startedAt = Date.now();
  const timeoutMs = 120000;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const params = new URLSearchParams({ contractsDir, traceFileLimit: '2' });
      const response = await fetch(`${baseUrl}/api/debug/payload?${params.toString()}`, {
        method: 'GET'
      });
      if (response.ok) {
        return;
      }
    } catch {
      // continue polling
    }
    await setTimeoutAsync(800);
  }

  throw new Error('Next.js server did not become ready in time');
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: '1'
      },
      stdio: 'inherit'
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} failed with code ${code ?? 'unknown'}`));
    });
  });
}

async function main() {
  const fixture = await createFixture();
  if (process.env.WORKBENCH_SMOKE_SKIP_BUILD !== '1') {
    await runCommand('pnpm', ['exec', 'next', 'build', '--webpack'], webDir);
  }

  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn('pnpm', ['exec', 'next', 'start', '--port', String(port)], {
    cwd: webDir,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let logs = '';
  const onLog = (chunk) => {
    logs += chunk.toString('utf-8');
  };
  server.stdout.on('data', onLog);
  server.stderr.on('data', onLog);

  const teardown = () => {
    if (!server.killed) {
      server.kill('SIGTERM');
    }
    fs.rmSync(fixture.tmpRoot, { recursive: true, force: true });
  };

  process.on('SIGINT', () => {
    teardown();
    process.exit(130);
  });

  try {
    await waitForServer(baseUrl, fixture.contractsDir);

    const htmlResponse = await fetch(`${baseUrl}/`);
    const html = await htmlResponse.text();
    assert(htmlResponse.ok, 'workbench page should be reachable');
    assert(html.includes('Dubhe Debug Workbench'), 'workbench page should render title');

    const collect = await requestJson(baseUrl, '/api/debug/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'collect', contractsDir: fixture.contractsDir })
    });
    assert(collect.response.ok, `collect should succeed: ${JSON.stringify(collect.json)}`);
    assert(collect.json.ok === true, 'collect response must be ok=true');

    const debugOpen = await requestJson(baseUrl, '/api/debug/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'debug-open',
        contractsDir: fixture.contractsDir,
        traceFile: fixture.traceAZst
      })
    });
    assert(debugOpen.response.ok, `debug-open should succeed: ${JSON.stringify(debugOpen.json)}`);

    const slowReplayPromise = requestJson(baseUrl, '/api/debug/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'replay',
        contractsDir: fixture.contractsDir,
        command: 'dubhe debug --sleep'
      })
    });

    await setTimeoutAsync(250);
    const replayBusy = await requestJson(baseUrl, '/api/debug/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'replay',
        contractsDir: fixture.contractsDir,
        command: 'dubhe debug'
      })
    });
    assert(replayBusy.response.status === 429, 'concurrent run should return 429');

    const slowReplay = await slowReplayPromise;
    assert(slowReplay.response.ok, `slow replay should eventually succeed: ${JSON.stringify(slowReplay.json)}`);

    const replayBlockedTokens = await requestJson(baseUrl, '/api/debug/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'replay',
        contractsDir: fixture.contractsDir,
        command: 'dubhe debug; echo hacked'
      })
    });
    assert(replayBlockedTokens.response.status === 400, 'blocked shell token command should be rejected');

    const replayBlockedSubcommand = await requestJson(baseUrl, '/api/debug/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'replay',
        contractsDir: fixture.contractsDir,
        command: 'dubhe publish --network localnet'
      })
    });
    assert(replayBlockedSubcommand.response.status === 400, 'disallowed subcommand should be rejected');

    const compareParams = new URLSearchParams({
      contractsDir: fixture.contractsDir,
      a: fixture.traceAZst,
      b: fixture.traceBZst
    });
    const compare = await requestJson(baseUrl, `/api/debug/compare?${compareParams.toString()}`);
    assert(compare.response.ok, `compare should succeed: ${JSON.stringify(compare.json)}`);
    assert(compare.json.summary && typeof compare.json.summary.instructionDelta === 'number', 'compare summary should include instructionDelta');

    const compareBad = await requestJson(
      baseUrl,
      `/api/debug/compare?contractsDir=${encodeURIComponent(fixture.contractsDir)}&a=${encodeURIComponent(fixture.traceAZst)}`
    );
    assert(compareBad.response.status === 400, 'compare missing b should return 400');

    const annotationsGet1 = await requestJson(
      baseUrl,
      `/api/debug/annotations?contractsDir=${encodeURIComponent(fixture.contractsDir)}`
    );
    assert(annotationsGet1.response.ok, 'annotations GET should succeed');
    assert(annotationsGet1.json.revision === '0', 'initial annotations revision should be 0');

    const annotationsPut = await requestJson(baseUrl, '/api/debug/annotations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractsDir: fixture.contractsDir,
        revision: annotationsGet1.json.revision,
        annotations: {
          'trace-instruction-1': {
            starred: true,
            note: 'smoke-note',
            updatedAt: new Date().toISOString()
          }
        }
      })
    });
    assert(annotationsPut.response.ok, `annotations PUT should succeed: ${JSON.stringify(annotationsPut.json)}`);

    const annotationsGet2 = await requestJson(
      baseUrl,
      `/api/debug/annotations?contractsDir=${encodeURIComponent(fixture.contractsDir)}`
    );
    assert(annotationsGet2.response.ok, 'annotations GET after update should succeed');
    assert(
      annotationsGet2.json.annotations?.['trace-instruction-1']?.note === 'smoke-note',
      'annotation note should roundtrip'
    );

    const annotationsConflict = await requestJson(baseUrl, '/api/debug/annotations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractsDir: fixture.contractsDir,
        revision: '0',
        annotations: {
          stale: {
            starred: false,
            note: 'stale',
            updatedAt: new Date().toISOString()
          }
        }
      })
    });
    assert(annotationsConflict.response.status === 409, 'stale revision should return 409 conflict');

    console.log('Smoke checks passed: run/compare/annotations/frontend');
  } catch (error) {
    console.error('Smoke checks failed.');
    console.error(error instanceof Error ? error.message : String(error));
    if (logs.trim().length > 0) {
      console.error('---- Next.js logs ----');
      console.error(logs.slice(-6000));
    }
    process.exitCode = 1;
  } finally {
    teardown();
  }
}

void main();
