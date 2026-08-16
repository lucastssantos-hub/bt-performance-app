#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const MEDIA = new Map([
  ['.gif', ['gif', 'image/gif']],
  ['.webp', ['imagem', 'image/webp']],
  ['.jpg', ['imagem', 'image/jpeg']],
  ['.jpeg', ['imagem', 'image/jpeg']],
  ['.png', ['imagem', 'image/png']],
  ['.mp4', ['video', 'video/mp4']],
  ['.webm', ['video', 'video/webm']],
]);

const EQUIPAMENTOS = [
  ['barra', /barra|barbell|smith/i],
  ['halter', /halter|dumbbell/i],
  ['cabo-polia', /cabo|polia|cable/i],
  ['kettlebell', /kettlebell/i],
  ['superband', /superband|resistance.?band/i],
  ['maquina', /maquina|máquina|hack|machine/i],
  ['banco', /banco|bench/i],
  ['peso-corporal', /funcional|bodyweight/i],
  ['cardio', /cardio/i],
];

const REGIOES = [
  ['core', /abdominal|core/i],
  ['antebraco', /antebra|forearm/i],
  ['biceps', /biceps|bíceps/i],
  ['costas', /costas|back/i],
  ['ombros', /ombro|shoulder/i],
  ['peito', /peito|chest/i],
  ['membros-inferiores', /perna|leg|glute|quadricep|hamstring|calf/i],
  ['triceps', /triceps|tríceps/i],
];

function slug(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\b(wrong|right|correto|errado)\b/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').replace(/-+/g, '-');
}

function title(text) {
  return text.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function firstMatch(text, rules, fallback) {
  return rules.find(([, expression]) => expression.test(text))?.[0] ?? fallback;
}

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (MEDIA.has(path.extname(entry.name).toLowerCase())) files.push(absolute);
  }
  return files;
}

async function hashFile(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

function parseArgs(argv) {
  const values = { apply: false, out: 'tmp/catalogo-exercicios-drive.json' };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--apply') values.apply = true;
    else if (argv[index] === '--out') values.out = argv[++index];
    else if (argv[index] === '--stage') values.stage = argv[++index];
    else if (argv[index] === '--sql') values.sql = argv[++index];
    else if (!values.source) values.source = argv[index];
    else throw new Error(`Argumento desconhecido: ${argv[index]}`);
  }
  if (!values.source) throw new Error('Uso: node scripts/importar-exercicios-drive.mjs <pasta-exportada> [--out arquivo.json] [--apply]');
  return values;
}

async function writeSql(manifest, file) {
  const exercises = [...new Map(manifest.map((item) => [item.exercicio_id, {
    exercicio_id: item.exercicio_id, nome: item.nome, nome_curto: item.nome,
    grupo: 'biblioteca-geral', ambiente: item.ambiente, regiao: item.regiao,
    equipamento: item.equipamento,
  }])).values()];
  const media = manifest.map((item) => {
    const row = { ...item, storage_bucket: 'bt-exercicios', fonte: 'google-drive', ativo: true, versao: 1 };
    delete row.arquivo_local; delete row.nome; delete row.regiao; delete row.equipamento; delete row.ambiente;
    return row;
  });
  const sql = `-- Gerado por importar-exercicios-drive.mjs\n` +
    `with dados as (select * from jsonb_to_recordset($bt_exercicios$${JSON.stringify(exercises)}$bt_exercicios$::jsonb) as x(exercicio_id text,nome text,nome_curto text,grupo text,ambiente text,regiao text,equipamento text[]))\n` +
    `insert into public.bt_biblioteca_exercicios (exercicio_id,nome,nome_curto,grupo,ambiente,regiao,equipamento) select exercicio_id,nome,nome_curto,grupo,ambiente,regiao,equipamento from dados on conflict (exercicio_id) do nothing;\n` +
    `with dados as (select * from jsonb_to_recordset($bt_midias$${JSON.stringify(media)}$bt_midias$::jsonb) as x(exercicio_id text,storage_bucket text,storage_path text,tipo text,demonstrador text,angulo text,finalidade text,mime_type text,fonte text,fonte_arquivo text,tamanho_bytes bigint,checksum_sha256 text,ativo boolean,versao integer))\n` +
    `insert into public.bt_exercicio_midias (exercicio_id,storage_bucket,storage_path,tipo,demonstrador,angulo,finalidade,mime_type,fonte,fonte_arquivo,tamanho_bytes,checksum_sha256,ativo,versao) select exercicio_id,storage_bucket,storage_path,tipo,demonstrador,angulo,finalidade,mime_type,fonte,fonte_arquivo,tamanho_bytes,checksum_sha256,ativo,versao from dados on conflict (storage_bucket,storage_path) do update set atualizado_em=now();\n`;
  await fs.mkdir(path.dirname(path.resolve(file)), { recursive: true });
  await fs.writeFile(file, sql);
  return path.resolve(file);
}

async function stageManifest(manifest, directory) {
  const root = path.resolve(directory);
  for (const item of manifest) {
    const destination = path.join(root, item.storage_path);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    try { await fs.link(item.arquivo_local, destination); }
    catch (error) {
      if (error.code === 'EEXIST') continue;
      if (error.code !== 'EXDEV') throw error;
      await fs.copyFile(item.arquivo_local, destination);
    }
  }
  return root;
}

async function makeManifest(source) {
  const root = path.resolve(source);
  const files = await walk(root);
  const manifest = [];
  for (const absolute of files.sort()) {
    const relative = path.relative(root, absolute);
    const parts = relative.split(path.sep);
    const extension = path.extname(absolute).toLowerCase();
    const base = path.basename(absolute, extension);
    const context = `${relative} ${base}`;
    const demonstrador = /feminino/i.test(parts[0]) ? 'feminino' : /masculino/i.test(parts[0]) ? 'masculino' : 'neutro';
    const finalidade = /wrong|errado/i.test(base) ? 'erro_comum' : /right|correto/i.test(base) ? 'educativo' : 'execucao';
    const exerciseId = slug(base) || `exercicio-${createHash('sha1').update(relative).digest('hex').slice(0, 10)}`;
    const [{ size }, checksum] = await Promise.all([fs.stat(absolute), hashFile(absolute)]);
    const [tipo, mimeType] = MEDIA.get(extension);
    const storagePath = `v1/${exerciseId}/${demonstrador}/${finalidade}-${checksum.slice(0, 12)}${extension}`;
    manifest.push({
      exercicio_id: exerciseId,
      nome: title(slug(base)),
      regiao: firstMatch(context, REGIOES, null),
      equipamento: [firstMatch(context, EQUIPAMENTOS, 'nao-identificado')],
      ambiente: /funcional/i.test(context) ? 'funcional' : /cardio/i.test(context) ? 'cardio' : 'academia',
      demonstrador,
      finalidade,
      angulo: 'outro',
      tipo,
      mime_type: mimeType,
      storage_path: storagePath,
      fonte_arquivo: relative,
      tamanho_bytes: size,
      checksum_sha256: checksum,
      arquivo_local: absolute,
    });
  }
  return manifest;
}

function dedupeManifest(manifest) {
  const byPath = new Map();
  for (const item of manifest) if (!byPath.has(item.storage_path)) byPath.set(item.storage_path, item);
  const byVariant = new Map();
  for (const item of byPath.values()) {
    const key = [item.exercicio_id, item.demonstrador, item.angulo, item.finalidade].join('|');
    const current = byVariant.get(key);
    if (!current || item.tamanho_bytes > current.tamanho_bytes) byVariant.set(key, item);
  }
  return [...byVariant.values()].sort((a, b) => a.storage_path.localeCompare(b.storage_path));
}

async function api(url, key, endpoint, init = {}) {
  const response = await fetch(`${url}${endpoint}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, ...init.headers },
  });
  if (!response.ok) throw new Error(`${response.status} ${endpoint}: ${await response.text()}`);
  return response;
}

async function applyManifest(manifest) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('--apply exige SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em ambiente administrativo.');

  const exercises = [...new Map(manifest.map((item) => [item.exercicio_id, {
    exercicio_id: item.exercicio_id,
    nome: item.nome,
    nome_curto: item.nome,
    grupo: 'biblioteca-geral',
    ambiente: item.ambiente,
    regiao: item.regiao,
    equipamento: item.equipamento,
    ativo: true,
  }])).values()];
  await api(url, key, '/rest/v1/bt_biblioteca_exercicios?on_conflict=exercicio_id', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify(exercises),
  });

  for (const item of manifest) {
    const variantQuery = new URLSearchParams({
      select: 'id,storage_path,versao',
      exercicio_id: `eq.${item.exercicio_id}`,
      demonstrador: `eq.${item.demonstrador}`,
      angulo: `eq.${item.angulo}`,
      finalidade: `eq.${item.finalidade}`,
      ativo: 'eq.true',
    });
    const currentResponse = await api(url, key, `/rest/v1/bt_exercicio_midias?${variantQuery}`);
    const [current] = await currentResponse.json();
    if (current?.storage_path === item.storage_path) continue;
    const bytes = await fs.readFile(item.arquivo_local);
    await api(url, key, `/storage/v1/object/bt-exercicios/${item.storage_path}`, {
      method: 'POST', headers: { 'Content-Type': item.mime_type, 'x-upsert': 'true' }, body: bytes,
    });
    if (current) {
      await api(url, key, `/rest/v1/bt_exercicio_midias?id=eq.${current.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ativo: false }),
      });
    }
    const metadata = { ...item, storage_bucket: 'bt-exercicios', ativo: true, versao: (current?.versao ?? 0) + 1 };
    delete metadata.arquivo_local;
    delete metadata.nome;
    delete metadata.regiao;
    delete metadata.equipamento;
    delete metadata.ambiente;
    await api(url, key, '/rest/v1/bt_exercicio_midias?on_conflict=storage_bucket,storage_path', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify([metadata]),
    });
  }
}

const args = parseArgs(process.argv.slice(2));
const discovered = await makeManifest(args.source);
const manifest = dedupeManifest(discovered);
await fs.mkdir(path.dirname(path.resolve(args.out)), { recursive: true });
await fs.writeFile(args.out, `${JSON.stringify(manifest, null, 2)}\n`);

const unidentified = manifest.filter((item) => item.equipamento.includes('nao-identificado')).length;
console.log(`${manifest.length} mídias catalogadas; ${unidentified} exigem revisão de equipamento.`);
if (discovered.length !== manifest.length) console.log(`${discovered.length - manifest.length} duplicatas consolidadas por arquivo/variante.`);
console.log(`Manifesto: ${path.resolve(args.out)}`);
if (args.stage) console.log(`Arquivos preparados em: ${await stageManifest(manifest, args.stage)}`);
if (args.sql) console.log(`SQL de metadados: ${await writeSql(manifest, args.sql)}`);
if (args.apply) {
  if (unidentified) throw new Error('Importação interrompida: revise os itens com equipamento "nao-identificado" no manifesto.');
  await applyManifest(manifest);
  console.log('Upload e metadados concluídos no Supabase.');
} else {
  console.log('Prévia apenas. Revise o manifesto e execute novamente com --apply.');
}
