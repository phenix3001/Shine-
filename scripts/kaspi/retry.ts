import { access, open, readFile, unlink, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as pause } from 'node:timers/promises';
import type { PreparationState } from './types.ts';

async function exists(path: string) {
  return access(path).then(() => true, (error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return false;
    throw error;
  });
}
async function run(script: string, args: string[] = []) {
  console.log(`Starting ${script}`);
  return new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, [`scripts/kaspi/${script}.ts`, ...args], { stdio: 'inherit', windowsHide: true });
    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 1));
  });
}
async function state() {
  return JSON.parse(await readFile('kaspi-staging/progress.json', 'utf8')) as PreparationState;
}
const lock = await open('kaspi-staging/retry.lock', 'wx');
try {
  const deadline = Date.now() + 24 * 60 * 60 * 1000;
  console.log('Waiting for the current preparation and catalog workers to finish.');
  while (await exists('kaspi-staging/run.lock') || await exists('kaspi-staging/collect.lock')) {
    if (Date.now() > deadline) throw new Error('Worker lock still present after 24 hours; check running processes.');
    await pause(10_000);
  }
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`Recovery pass ${attempt}/3`);
    const manifest = JSON.parse(await readFile('kaspi-staging/merchant.json', 'utf8')) as {
      complete: boolean; products: { id: string; url: string }[];
    };
    await writeFile('kaspi-staging/retry-products.txt', manifest.products.map((product) => product.url).join('\n'));
    await run('prepare', ['--links', 'kaspi-staging/retry-products.txt', '--limit', '20000']);
    if (Object.values((await state()).errors).some((error) => /HTTP (401|403|429)/.test(error))) {
      throw new Error('Kaspi access/rate limit response; automatic recovery stopped.');
    }
    const code = await run('collect');
    if (code === 0 && (await state()).stage === 'finished') {
      console.log('Preparation and catalog verification complete. Supabase upload can begin in the signed-in import page.');
      break;
    }
    if (attempt === 3) throw new Error('Recovery attempts exhausted; inspect remaining errors. Existing downloads are preserved.');
    await pause(30_000);
  }
} finally {
  await lock.close();
  await unlink('kaspi-staging/retry.lock');
}
