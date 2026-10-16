// Runs generated code with the toolchain on this machine. A timeout and a stripped environment (no API keys) are applied.
// This is not a security boundary. For untrusted code, run the server inside a container with no network (see README).
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const isWin = process.platform === 'win32';
const which = c => {
  try {
    const res = isWin
      ? spawnSync('where.exe', [c], { encoding: 'utf8' })
      : spawnSync('sh', ['-c', `command -v ${c}`], { encoding: 'utf8' });
    return (res?.stdout || '').trim();
  } catch {
    return '';
  }
};
export const toolchains = () => ({
  java: !!which('javac') && !!which('java'),
  python: !!which('python3') || !!which('python'),
  node: !!which('node')
});

const SPEC = {
  java: { file: 'Main.java', cmd: () => ['java', ['Main.java']] },
  python: { file: 'main.py', cmd: () => [which('python3') ? 'python3' : 'python', ['main.py']] },
  node: { file: 'main.mjs', cmd: () => ['node', ['main.mjs']] },
  ts: { file: 'main.ts', cmd: () => ['node', ['--experimental-strip-types', '--no-warnings', 'main.ts']] },
};
/** Maps the UI language names to a runner id (or null when this app has no runner for it). */
export const runnerFor = lang => ({ java: 'java', python: 'python', 'node.js': 'node', node: 'node', javascript: 'node', typescript: 'ts' })[String(lang).toLowerCase()] ?? null;

const NOISE = /^Picked up (JAVA_TOOL_OPTIONS|_JAVA_OPTIONS|JDK_JAVA_OPTIONS).*$/gm;
const cap = s => (s.length > 20000 ? s.slice(0, 20000) + '\n…output truncated' : s);

export async function run(runner, code, { timeoutMs = 10000 } = {}) {
  const spec = SPEC[runner];
  if (!spec) return { ok: false, exitCode: -1, stdout: '', stderr: `No runner for "${runner}"`, ms: 0, timedOut: false, unsupported: true };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'learnify-run-'));
  fs.writeFileSync(path.join(dir, spec.file), code);
  const [cmd, args] = spec.cmd();
  const t0 = Date.now();
  return new Promise(resolve => {
    let stdout = '', stderr = '', timedOut = false, done = false;
    const child = spawn(cmd, args, { cwd: dir, env: { ...process.env, HOME: dir, USERPROFILE: dir, LANG: 'C.UTF-8' }, stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => { timedOut = true; try { child.kill('SIGKILL'); } catch { child.kill(); } }, timeoutMs);
    child.stdout.on('data', d => { if (stdout.length < 40000) stdout += d; });
    child.stderr.on('data', d => { if (stderr.length < 40000) stderr += d; });
    const finish = (exitCode, extra = '') => {
      if (done) return; done = true; clearTimeout(timer);
      fs.rm(dir, { recursive: true, force: true }, () => {});
      stderr = (stderr + extra).replace(NOISE, '').trim();
      if (timedOut) stderr = `Timed out after ${timeoutMs / 1000}s\n` + stderr;
      resolve({ ok: exitCode === 0 && !timedOut, exitCode, stdout: cap(stdout.replace(/\s+$/, '')), stderr: cap(stderr), ms: Date.now() - t0, timedOut });
    };
    child.on('error', e => finish(-1, `Failed to start ${cmd}: ${e.message}`));
    child.on('close', code => finish(code ?? -1));
  });
}

export const normalize = s => String(s ?? '').replace(/\r/g, '').split('\n').map(l => l.replace(/\s+$/, '')).join('\n').trim();
export function parseTests(stdout) {
  return stdout.split('\n').map(l => l.match(/^(PASS|FAIL):\s*(.*)$/)).filter(Boolean).map(m => {
    const [name, ...rest] = m[2].split(/\s+-\s+/);
    return { name: name.trim(), pass: m[1] === 'PASS', error: rest.join(' - ') || undefined };
  });
}
