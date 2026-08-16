#!/usr/bin/env node

import { createWriteStream, promises as fs } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import readline from 'node:readline';
import { Readable } from 'node:stream';

const root = path.resolve(process.argv[2] || '/private/tmp/bt-drive-direto');
const concurrency = Math.max(1, Number(process.argv[3] || 6));
const records = [];

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of input) {
  if (!line.trim()) continue;
  const record = JSON.parse(line);
  if (record.done) break;
  records.push(record);
}

let completed = 0;
let bytes = 0;

async function download(record) {
  const destination = path.resolve(root, record.path);
  if (!destination.startsWith(`${root}${path.sep}`)) throw new Error(`Caminho inseguro: ${record.path}`);
  await fs.mkdir(path.dirname(destination), { recursive: true });

  const expected = Number(record.size || 0);
  try {
    const stat = await fs.stat(destination);
    if (!expected || stat.size === expected) {
      completed += 1; bytes += stat.size; return;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const temporary = `${destination}.part`;
  const url = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(record.id)}&export=download&confirm=t`;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: 'follow' });
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
      await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary));
      const stat = await fs.stat(temporary);
      if (expected && stat.size !== expected) throw new Error(`tamanho ${stat.size}, esperado ${expected}`);
      await fs.rename(temporary, destination);
      completed += 1; bytes += stat.size;
      if (completed % 100 === 0) console.log(`${completed}/${records.length} arquivos; ${(bytes / 1024 / 1024).toFixed(0)} MB`);
      return;
    } catch (error) {
      lastError = error;
      await fs.rm(temporary, { force: true });
    }
  }
  throw new Error(`${record.path}: ${lastError?.message}`);
}

let cursor = 0;
async function worker() {
  while (cursor < records.length) await download(records[cursor++]);
}

await fs.mkdir(root, { recursive: true });
await Promise.all(Array.from({ length: concurrency }, () => worker()));
console.log(`Concluído: ${completed} arquivos; ${(bytes / 1024 / 1024).toFixed(0)} MB; ${root}`);
