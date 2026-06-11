// remote.js — cliente Supabase do app (Auth GoTrue + PostgREST sobre as tabelas bt_*).
// Substitui o antigo espelho de estado (bt_app_estado), que era a fonte de verdade
// remota até 2026-06-11 e agora é LEGADO (a tabela ainda existe, mas não é mais usada).
// Sem dependências: fala HTTP puro com /auth/v1 e /rest/v1.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const TOK = 'btperf_auth_v2';

let sess = null; // { access_token, refresh_token, expires_at, user_id, email }
try { sess = JSON.parse(localStorage.getItem(TOK)); } catch (e) { sess = null; }

function saveSess(s) {
  sess = s;
  if (s) localStorage.setItem(TOK, JSON.stringify(s));
  else localStorage.removeItem(TOK);
}

export const session = () => sess;
export const remoteEnabled = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let avisado = false;
export function falhouSync(err) {
  console.warn('[remote] operação falhou:', err && err.message);
  if (!avisado) {
    avisado = true;
    window.dispatchEvent(new CustomEvent('btp-sync-error'));
  }
}
export function syncOk() { avisado = false; }

// ── Auth (GoTrue) ────────────────────────────────────────────────────────────
async function authReq(path, body, bearer) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${bearer || SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error_description || j.msg || j.message || `HTTP ${res.status}`);
  return j;
}

function sessFromGrant(j) {
  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (j.expires_in || 3600),
    user_id: j.user && j.user.id,
    email: j.user && j.user.email,
  };
}

export async function signIn(email, password) {
  const j = await authReq('token?grant_type=password', { email, password });
  saveSess(sessFromGrant(j));
  return sess;
}

// Renova o token se está a menos de 60s de expirar. Retorna a sessão válida ou null.
export async function refreshIfNeeded() {
  if (!sess) return null;
  if (sess.expires_at - 60 > Date.now() / 1000) return sess;
  try {
    const j = await authReq('token?grant_type=refresh_token', { refresh_token: sess.refresh_token });
    saveSess(sessFromGrant(j));
    return sess;
  } catch (err) {
    console.warn('[remote] sessão expirada:', err.message);
    saveSess(null);
    return null;
  }
}

export async function signOut() {
  if (sess) { try { await authReq('logout', null, sess.access_token); } catch (e) { /* token já morto */ } }
  saveSess(null);
}

// ── PostgREST ────────────────────────────────────────────────────────────────
export async function rest(path, { method = 'GET', body, headers = {} } = {}, timeoutMs = 9000) {
  if (!sess) throw new Error('sem sessão');
  if (sess.expires_at - 60 <= Date.now() / 1000) await refreshIfNeeded();
  if (!sess) throw new Error('sessão expirada');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${sess.access_token}`,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctl.signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}${txt ? ` · ${txt.slice(0, 140)}` : ''}`);
    }
    if (res.status === 204) return null;
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  } finally { clearTimeout(timer); }
}

export const restGet = (path) => rest(path);
export const restPost = (table, rows, prefer = 'return=representation') =>
  rest(table, { method: 'POST', body: rows, headers: { Prefer: prefer } });
export const restUpsert = (table, rows) =>
  rest(table, { method: 'POST', body: rows, headers: { Prefer: 'resolution=merge-duplicates,return=representation' } });
export const restPatch = (path, patch) =>
  rest(path, { method: 'PATCH', body: patch, headers: { Prefer: 'return=representation' } });
export const restDelete = (path) => rest(path, { method: 'DELETE' });
