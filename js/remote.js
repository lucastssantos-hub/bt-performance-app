// remote.js — espelho remoto do estado no Supabase (tabela bt_app_estado, via PostgREST puro).
// Local-first: o app lê/escreve sempre no cache local; este módulo só puxa no boot
// e empurra (debounced, last-write-wins) a cada gravação. Sem dependências.
import { SUPABASE_URL, SUPABASE_ANON_KEY, ESTADO_ID } from './supabase-config.js';

const TABLE = 'bt_app_estado';
const HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export const remoteEnabled = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let avisado = false;
function falhou(err) {
  console.warn('[remote] sync falhou:', err && err.message);
  if (!avisado) {
    avisado = true;
    window.dispatchEvent(new CustomEvent('btp-sync-error'));
  }
}

async function req(path, options = {}, timeoutMs = 6000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers: { ...HEADERS, ...options.headers }, signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally { clearTimeout(timer); }
}

// Busca o estado remoto. Retorna o objeto de estado, ou null se a linha não existe.
export async function pullEstado() {
  const res = await req(`${TABLE}?id=eq.${encodeURIComponent(ESTADO_ID)}&select=estado`);
  const rows = await res.json();
  return rows.length ? rows[0].estado : null;
}

// Empurra o estado inteiro (upsert). Debounced para coalescer gravações em rajada.
let pendente = null;
let timer = null;
export function schedulePush(estado) {
  if (!remoteEnabled()) return;
  pendente = estado;
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const body = JSON.stringify([{ id: ESTADO_ID, estado: pendente, atualizado_em: new Date().toISOString() }]);
    try {
      await req(TABLE, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body });
      avisado = false; // voltou a sincronizar
    } catch (err) { falhou(err); }
  }, 1200);
}
