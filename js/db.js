// db.js — camada de dados do app sobre o SCHEMA CANÔNICO v2 (Supabase Auth + tabelas bt_*).
// Arquitetura: as telas continuam síncronas lendo um cache em memória; o cache é hidratado
// das tabelas canônicas no boot/login e cada escrita é traduzida para PostgREST (fila
// serializada). O localStorage guarda só um SNAPSHOT para render instantâneo — a fonte de
// verdade é o Supabase (bt_app_estado NÃO é mais usado; ver remote.js).
//
// Coleções canônicas (lidas/escritas no Supabase):
//   athletes→bt_atletas · checkins→bt_monitoramento_diario+bt_dor_registros+bt_prontidao_v1
//   sessions→bt_carga_sessoes (+bt_sessoes_prescritas, leitura/execução) · assessments→bt_avaliacoes
//   tournaments→bt_torneios · travels→bt_viagens · decisions→bt_decisoes_semana
// Coleções LEGADO (sem tabela canônica — só localStorage, por dispositivo):
//   notifications, messages, reports, settings
import {
  session, signIn, signOut, refreshIfNeeded,
  restGet, restPost, restUpsert, restPatch, restDelete, falhouSync, syncOk,
} from './remote.js';

const SNAP = 'btperf_cache_v2';   // snapshot do cache canônico (render instantâneo)
const LOCAL = 'btperf_local_v2';  // coleções legado (notificações, mensagens, relatórios, settings)
const PERFIL = 'btperf_perfil_v2';

export const uid = () => Math.random().toString(36).slice(2, 10);
export const iso = (d) => d.toISOString().slice(0, 10);
export const todayISO = () => iso(new Date());
export const addDays = (base, n) => { const d = new Date(base + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
export const dayN = (n) => addDays(todayISO(), n);
export const diffDays = (a, b) => Math.round((new Date(a + 'T12:00:00') - new Date(b + 'T12:00:00')) / 86400000);
export const mondayOf = (dateStr) => { const d = new Date(dateStr + 'T12:00:00'); const w = (d.getDay() + 6) % 7; return addDays(iso(d), -w); };

const initialsOf = (name) => String(name || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
const ageOf = (nasc) => nasc ? Math.floor(diffDays(todayISO(), nasc) / 365.25) : '—';

// ── prontidão: a VIEW bt_prontidao_v1 é a única fonte (5–25 + banda canônica).
// Para os anéis 0–100 das telas, escala por banda: VERMELHO 5–14→20–64,
// AMARELO 15–17→65–79, VERDE 18–25→80–100 (mantém as cores fiéis ao canônico).
function scaleReadiness(p) {
  if (p == null) return 0;
  if (p >= 18) return Math.round(80 + (p - 18) * (20 / 7));
  if (p >= 15) return Math.round(65 + (p - 15) * 7);
  return Math.round(20 + (p - 5) * (44 / 9));
}

// ── cache ────────────────────────────────────────────────────────────────────
const EMPTY = () => ({
  users: [], athletes: [], checkins: [], sessions: [], assessments: [],
  tournaments: [], travels: [], decisions: {}, decisoesRaw: {},
  notifications: [], messages: [], reports: [], settings: { pushEnabled: true, units: 'métrico' },
});
let cache = EMPTY();
let hydrated = false;
try {
  const snap = JSON.parse(localStorage.getItem(SNAP));
  if (snap && snap.athletes) Object.assign(cache, snap);
  const loc = JSON.parse(localStorage.getItem(LOCAL));
  if (loc) Object.assign(cache, loc);
} catch (e) { /* snapshot corrompido: segue vazio */ }

export const ready = () => hydrated || (cache.athletes || []).length > 0;

const CANON = new Set(['users', 'athletes', 'checkins', 'sessions', 'assessments', 'tournaments', 'travels']);
function persistSnapshot() {
  const { users, athletes, checkins, sessions, assessments, tournaments, travels, decisions, decisoesRaw } = cache;
  localStorage.setItem(SNAP, JSON.stringify({ users, athletes, checkins, sessions, assessments, tournaments, travels, decisions, decisoesRaw }));
}
function persistLocal() {
  const { notifications, messages, reports, settings } = cache;
  localStorage.setItem(LOCAL, JSON.stringify({ notifications, messages, reports, settings }));
}

// ── fila de escrita remota (serializada; resolve ids temporários) ────────────
let chain = Promise.resolve();
const idMap = {}; // id temporário → id real (bt_carga_sessoes)
const realId = (id) => idMap[id] || id;
function enqueue(fn) {
  chain = chain.then(fn).then(() => syncOk()).catch((err) => falhouSync(err));
  return chain;
}

// ── mapeamentos canônico ⇄ legado ────────────────────────────────────────────
const TIPO_APP = { tecnica: 'Quadra', tatica: 'Quadra', 'jogo-treino': 'Quadra', 'jogo-oficial': 'Quadra', fisica: 'Força' };

function sessToRow(s) {
  return {
    atleta_id: s.athleteId,
    data: s.date,
    tipo: s.type === 'Quadra' ? 'tecnica' : 'fisica',
    duracao_min: s.durationMinutes || null,
    pse_0a10: s.status === 'COMPLETED' && s.rpeFinal != null ? s.rpeFinal : null,
    superficie: s.location === 'SAND' ? 'areia' : s.location === 'GYM' ? 'academia' : null,
    // metadados do app (título, status, exercícios) viajam como JSON em observacoes —
    // LEGADO assumido: o lab lê CSVs, não esta coluna; linhas status!=COMPLETED são plano do app
    observacoes: JSON.stringify({
      app: 1, title: s.title, type: s.type, location: s.location, targetRpe: s.targetRpe,
      plannedLoad: s.plannedLoad, status: s.status, exercises: s.exercises || [], notes: s.notes || '',
    }),
  };
}

function rowToSession(r) {
  let meta = null;
  try { const j = JSON.parse(r.observacoes || ''); if (j && j.app) meta = j; } catch (e) { /* linha fora do app */ }
  if (meta) {
    return {
      id: 'c' + r.id, athleteId: r.atleta_id, date: r.data,
      title: meta.title || 'Sessão', type: meta.type || TIPO_APP[r.tipo] || 'Força', location: meta.location || 'GYM',
      durationMinutes: r.duracao_min ?? meta.durationMinutes ?? 0, targetRpe: meta.targetRpe ?? 7,
      plannedLoad: meta.plannedLoad ?? 0, status: meta.status || 'COMPLETED',
      rpeFinal: r.pse_0a10 != null ? +r.pse_0a10 : undefined,
      exercises: meta.exercises || [], notes: meta.notes || '',
    };
  }
  return { // linha registrada fora do app (lab): sempre carga executada
    id: 'c' + r.id, athleteId: r.atleta_id, date: r.data,
    title: (r.sessao_codigo ? r.sessao_codigo + ' · ' : '') + (r.tipo || 'sessão'),
    type: TIPO_APP[r.tipo] || 'Quadra', location: r.superficie === 'areia' ? 'SAND' : 'GYM',
    durationMinutes: r.duracao_min || 0, targetRpe: r.pse_0a10 != null ? +r.pse_0a10 : 7,
    plannedLoad: 0, status: 'COMPLETED', rpeFinal: r.pse_0a10 != null ? +r.pse_0a10 : undefined,
    exercises: [], notes: r.observacoes || '',
  };
}

const ST_PRESC = { PLANEJADA: 'PLANNED', CONCLUIDA: 'COMPLETED', PULADA: 'SKIPPED' };
const ST_PRESC_BACK = { PLANNED: 'PLANEJADA', IN_PROGRESS: 'PLANEJADA', COMPLETED: 'CONCLUIDA', SKIPPED: 'PULADA' };

function prescToSession(r, bibS, bibE) {
  const bib = bibS[r.sessao_codigo] || {};
  return {
    id: 'p' + r.id, athleteId: r.atleta_id, date: r.data, prescrita: true,
    title: `${r.sessao_codigo} · ${bib.nome || 'sessão prescrita'}`,
    type: bib.ambiente === 'areia' ? 'Quadra' : 'Força', location: bib.ambiente === 'areia' ? 'SAND' : 'GYM',
    durationMinutes: 0, targetRpe: '—', plannedLoad: 0,
    status: ST_PRESC[r.status] || 'PLANNED', rpeFinal: r.pse_final != null ? +r.pse_final : undefined,
    exercises: (r.exercicios || []).map((e, i) => ({
      id: e.exercicio_id || 'ex' + i, name: (bibE[e.exercicio_id] || {}).nome || e.exercicio_id || 'exercício',
      sets: e.series ?? '', reps: e.repeticoes ?? '', intensity: e.intensidade || '', rest: e.descanso || '',
      order: e.ordem ?? i, status: r.status === 'CONCLUIDA' ? 'DONE' : 'PENDING',
    })),
    notes: r.observacoes || '',
  };
}

// índice físico exibido nas telas — derivado em memória, NUNCA gravado (regra do lab)
function generalIndexOf(a) {
  let ix = 0;
  if (a.cmj) ix += a.cmj * 1.0;
  if (a.sprint10m) ix += (2.4 - a.sprint10m) * 35;
  if (a.sprint5m) ix += (1.4 - a.sprint5m) * 30;
  if (a.mbLateralD && a.mbLateralE) ix += ((a.mbLateralD + a.mbLateralE) / 2) * 3 - (a.mbAsym || 0) * 0.5;
  if (a.agility505) ix += (3 - a.agility505) * 15;
  if (a.ankleMobility) ix += a.ankleMobility * 0.3;
  return Math.max(0, Math.min(100, Math.round(ix)));
}

// ── hidratação: tabelas canônicas → cache em memória ─────────────────────────
async function hydrate() {
  const monday = mondayOf(todayISO());
  const [perfis, atletas, monit, dor, pront, carga, presc, bibS, bibE, aval, torn, viag, dec] = await Promise.all([
    restGet('bt_perfis?select=*'),
    restGet('bt_atletas?select=*&order=nome'),
    restGet('bt_monitoramento_diario?select=*&order=data.desc&limit=500'),
    restGet('bt_dor_registros?select=*&order=data.desc&limit=500'),
    restGet('bt_prontidao_v1?select=*&order=data.desc&limit=500'),
    restGet('bt_carga_sessoes?select=*&order=data.desc&limit=800'),
    restGet('bt_sessoes_prescritas?select=*&order=data.desc&limit=200'),
    restGet('bt_biblioteca_sessoes?select=codigo,nome,ambiente'),
    restGet('bt_biblioteca_exercicios?select=exercicio_id,nome'),
    restGet('bt_avaliacoes?select=*&order=data.desc&limit=1000'),
    restGet('bt_torneios?select=*'),
    restGet('bt_viagens?select=*'),
    restGet(`bt_decisoes_semana?semana_inicio=eq.${monday}`),
  ]);

  // usuários: perfis visíveis (o próprio; e o treinador, no caso do atleta)
  const me = currentProfile();
  const users = (perfis || []).map(p => ({
    id: p.user_id, name: p.nome, role: p.papel === 'treinador' ? 'TRAINER' : 'ATHLETE',
    athleteId: p.atleta_id || undefined, avatarInitials: initialsOf(p.nome),
  }));
  // treinador: pseudo-usuários dos atletas (chat local); atleta sem perfil do coach: placeholder
  if (me && me.papel === 'treinador') {
    (atletas || []).forEach(a => users.push({ id: 'au-' + a.atleta_id, name: a.nome, role: 'ATHLETE', athleteId: a.atleta_id, avatarInitials: initialsOf(a.nome) }));
  } else if (!users.some(u => u.role === 'TRAINER')) {
    users.push({ id: 'coach-placeholder', name: 'Treinador', role: 'TRAINER', avatarInitials: 'TR' });
  }

  // dor e prontidão indexadas por atleta|data (dor: pior registro do dia para o resumo)
  const dorByDay = {};
  (dor || []).forEach(d => {
    const k = d.atleta_id + '|' + d.data;
    if (!dorByDay[k] || d.intensidade_0a10 > dorByDay[k].intensidade_0a10) dorByDay[k] = d;
  });
  const prontByDay = {};
  (pront || []).forEach(p => { prontByDay[p.atleta_id + '|' + p.data] = p; });

  const checkins = (monit || []).map(m => {
    const k = m.atleta_id + '|' + m.data;
    const dd = dorByDay[k], pp = prontByDay[k];
    return {
      id: k, athleteId: m.atleta_id, date: m.data,
      sleepQuality: m.qualidade_sono, sleepHours: m.sono_horas != null ? +m.sono_horas : 0,
      energy: m.energia, humor: m.humor,
      musclePain: m.recuperacao_muscular != null ? 6 - m.recuperacao_muscular : 1, // app: 1 = melhor
      stress: m.tranquilidade != null ? 6 - m.tranquilidade : 1,                   // app: 1 = melhor
      painLocation: dd ? dd.regiao : '', painScore: dd ? dd.intensidade_0a10 : 0,
      alteraMovimento: dd ? !!dd.altera_movimento : false, emImpacto: dd ? !!dd.em_impacto : false,
      prontidao: pp ? pp.prontidao : null, banda: pp ? pp.banda : null,
      readinessScore: scaleReadiness(pp ? pp.prontidao : null),
    };
  });

  const lastReadiness = {};
  checkins.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(c => { if (c.prontidao != null) lastReadiness[c.athleteId] = c.readinessScore; });

  const athletes = (atletas || []).map(a => ({
    id: a.atleta_id, trainerId: a.treinador_id, name: a.nome, age: ageOf(a.data_nascimento),
    category: a.categoria || '', partnerName: '—', // dupla não existe no canônico (legado visual)
    status: a.status === 'lesionado' ? 'INJURED' : 'ACTIVE',
    recoveryScore: lastReadiness[a.atleta_id] || 0, notes: a.observacoes || '',
  }));

  const bibSesM = {}; (bibS || []).forEach(b => { bibSesM[b.codigo] = b; });
  const bibExM = {}; (bibE || []).forEach(b => { bibExM[b.exercicio_id] = b; });
  const sessions = [
    ...(carga || []).map(rowToSession),
    ...(presc || []).map(r => prescToSession(r, bibSesM, bibExM)),
  ];

  const avalById = {};
  (aval || []).forEach(r => {
    const k = r.avaliacao_id || (r.atleta_id + '|' + r.data);
    const g = avalById[k] || (avalById[k] = { id: k, athleteId: r.atleta_id, date: r.data, cmj: 0, sj: 0, sprint5m: 0, sprint10m: 0, mbLateralD: 0, mbLateralE: 0, mbAsym: 0, agility505: 0, ankleMobility: 0, notes: '' });
    const v = r.valor != null ? +r.valor : 0;
    if (r.teste === 'cmj') g.cmj = v;
    else if (r.teste === 'sj') g.sj = v;
    else if (r.teste === 'sprint_5m') g.sprint5m = v;
    else if (r.teste === 'sprint_10m') g.sprint10m = v;
    else if (r.teste === 'mb_lateral_d') g.mbLateralD = v;
    else if (r.teste === 'mb_lateral_e') g.mbLateralE = v;
    else if (r.teste === 'agilidade_505') g.agility505 = v;
    else if (r.teste === 'mobilidade_tornozelo') g.ankleMobility = v;
    if (r.observacoes && !g.notes) g.notes = r.observacoes;
  });
  const assessments = Object.values(avalById).map(a => ({ ...a, generalIndex: generalIndexOf(a) }));

  const tornById = {};
  (torn || []).forEach(r => {
    const k = r.torneio_id || 't' + r.id;
    const g = tornById[k] || (tornById[k] = { id: k, name: r.nome, location: r.local || '', level: r.categoria || '', startDate: r.data_inicio, endDate: r.data_fim, isMainTarget: r.prioridade === 'A', athletes: [] });
    if (!g.athletes.includes(r.atleta_id)) g.athletes.push(r.atleta_id);
  });

  const viagById = {};
  (viag || []).forEach(r => {
    let extra = {};
    try { extra = JSON.parse(r.observacoes || '') || {}; } catch (e) { extra = { notes: r.observacoes || '' }; }
    const k = r.viagem_id || 'v' + r.id;
    viagById[k] = viagById[k] || {
      id: k, tournamentId: extra.tournamentId || '', origin: extra.origin || '', destination: r.destino || '',
      departureDate: r.data_ida, arrivalDate: r.data_volta, hotel: extra.hotel || '', notes: extra.notes || '',
    };
  });

  const decisions = {}, decisoesRaw = {};
  (dec || []).forEach(r => {
    decisoesRaw[r.atleta_id] = r;
    decisions[r.atleta_id] = {
      decision: r.decisao_final || r.decisao_sugerida,
      note: r.motivo_ajuste || r.justificativa || '',
      appliedAt: r.decidido_em ? Date.parse(r.decidido_em) : Date.now(),
    };
  });

  Object.assign(cache, {
    users, athletes, checkins, sessions, assessments,
    tournaments: Object.values(tornById), travels: Object.values(viagById), decisions, decisoesRaw,
  });
  hydrated = true;
  persistSnapshot();
}

// ── sessão / auth (Supabase Auth real) ───────────────────────────────────────
function currentProfile() {
  try { return JSON.parse(localStorage.getItem(PERFIL)); } catch (e) { return null; }
}
function userFromProfile(p) {
  if (!p) return null;
  return { id: p.user_id, name: p.nome, email: p.email, role: p.papel === 'treinador' ? 'TRAINER' : 'ATHLETE', athleteId: p.atleta_id || undefined, avatarInitials: initialsOf(p.nome) };
}

async function ensureProfile(papelEscolhido) {
  const s = session();
  if (!s) return null;
  const rows = await restGet(`bt_perfis?user_id=eq.${s.user_id}&select=*`);
  let p = rows && rows[0];
  if (!p) {
    const nome = (s.email || 'Usuário').split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const created = await restPost('bt_perfis', [{ user_id: s.user_id, papel: papelEscolhido || 'treinador', nome }]);
    p = created && created[0];
  }
  if (p) localStorage.setItem(PERFIL, JSON.stringify({ ...p, email: s.email }));
  return p;
}

export const auth = {
  // async: autentica no GoTrue e garante o perfil em bt_perfis
  async login(email, password, papelEscolhido) {
    await signIn(String(email).trim().toLowerCase(), password);
    const p = await ensureProfile(papelEscolhido);
    if (!p) throw new Error('não foi possível carregar/criar o perfil');
    return userFromProfile({ ...p, email: session().email });
  },
  current() { return session() ? userFromProfile(currentProfile()) : null; },
  async logout() {
    await signOut();
    localStorage.removeItem(PERFIL);
    localStorage.removeItem(SNAP);
    cache = EMPTY();
    hydrated = false;
    try { const loc = JSON.parse(localStorage.getItem(LOCAL)); if (loc && loc.settings) cache.settings = loc.settings; } catch (e) { /* ok */ }
  },
};

// Boot/refresh: renova o token, garante perfil e hidrata o cache das tabelas bt_*.
export async function syncRemote() {
  if (!session()) return false;
  const s = await refreshIfNeeded();
  if (!s) { localStorage.removeItem(PERFIL); localStorage.removeItem(SNAP); cache = EMPTY(); return false; }
  try {
    await ensureProfile();
    await hydrate();
    syncOk();
    return true;
  } catch (err) {
    console.warn('[db] hidratação falhou (usando snapshot local):', err && err.message);
    falhouSync(err);
    return false;
  }
}

// ── escrita remota por coleção ───────────────────────────────────────────────
const REMOTE = {
  sessions: {
    insert(s) {
      const tempId = s.id;
      enqueue(async () => {
        const rows = await restPost('bt_carga_sessoes', [sessToRow(s)]);
        if (rows && rows[0]) {
          idMap[tempId] = 'c' + rows[0].id;
          const o = (cache.sessions || []).find(x => x.id === tempId);
          if (o) o.id = idMap[tempId];
          persistSnapshot();
        }
      });
    },
    update(s) {
      enqueue(async () => {
        const id = realId(s.id);
        if (id.startsWith('p')) { // prescrita: app só executa (status + PSE final)
          await restPatch(`bt_sessoes_prescritas?id=eq.${id.slice(1)}`, {
            status: ST_PRESC_BACK[s.status] || 'PLANEJADA',
            pse_final: s.rpeFinal != null ? s.rpeFinal : null,
          });
        } else {
          await restPatch(`bt_carga_sessoes?id=eq.${id.slice(1)}`, sessToRow(s));
        }
      });
    },
    remove(id) {
      enqueue(async () => {
        const rid = realId(id);
        if (rid.startsWith('p')) await restDelete(`bt_sessoes_prescritas?id=eq.${rid.slice(1)}`);
        else await restDelete(`bt_carga_sessoes?id=eq.${rid.slice(1)}`);
      });
    },
  },
  assessments: {
    insert(a) {
      enqueue(async () => {
        const rows = [];
        const add = (teste, variavel, valor, unidade) => { if (valor) rows.push({ avaliacao_id: a.id, atleta_id: a.athleteId, data: a.date, teste, variavel, valor, unidade, observacoes: rows.length ? null : (a.notes || null) }); };
        add('cmj', 'altura', a.cmj, 'cm');
        add('sj', 'altura', a.sj, 'cm');
        add('sprint_5m', 'tempo', a.sprint5m, 's');
        add('sprint_10m', 'tempo', a.sprint10m, 's');
        add('mb_lateral_d', 'distancia', a.mbLateralD, 'm');
        add('mb_lateral_e', 'distancia', a.mbLateralE, 'm');
        add('agilidade_505', 'tempo', a.agility505, 's');
        add('mobilidade_tornozelo', 'amplitude', a.ankleMobility, 'graus');
        if (rows.length) await restPost('bt_avaliacoes', rows, 'return=minimal');
      });
    },
  },
  tournaments: {
    insert(t) { REMOTE.tournaments.update(t); },
    update(t) { // estratégia: reescreve as linhas do torneio (1 linha canônica por atleta)
      enqueue(async () => {
        await restDelete(`bt_torneios?torneio_id=eq.${encodeURIComponent(t.id)}`);
        const rows = (t.athletes || []).map(aid => ({
          torneio_id: t.id, atleta_id: aid, nome: t.name, categoria: t.level || null,
          data_inicio: t.startDate, data_fim: t.endDate, local: t.location || null,
          prioridade: t.isMainTarget ? 'A' : 'B',
        }));
        if (rows.length) await restPost('bt_torneios', rows, 'return=minimal');
      });
    },
    remove(id) { enqueue(() => restDelete(`bt_torneios?torneio_id=eq.${encodeURIComponent(id)}`)); },
  },
  travels: {
    insert(tv) { REMOTE.travels.update(tv); },
    update(tv) {
      enqueue(async () => {
        await restDelete(`bt_viagens?viagem_id=eq.${encodeURIComponent(tv.id)}`);
        const tour = (cache.tournaments || []).find(t => t.id === tv.tournamentId);
        const atletas = (tour && tour.athletes && tour.athletes.length) ? tour.athletes
          : (cache.athletes[0] ? [cache.athletes[0].id] : []);
        const extra = JSON.stringify({ tournamentId: tv.tournamentId || '', origin: tv.origin || '', hotel: tv.hotel || '', notes: tv.notes || '' });
        const rows = atletas.map(aid => ({
          viagem_id: tv.id, atleta_id: aid, data_ida: tv.departureDate, data_volta: tv.arrivalDate,
          destino: tv.destination || null, motivo: 'torneio', observacoes: extra,
        }));
        if (rows.length) await restPost('bt_viagens', rows, 'return=minimal');
      });
    },
    remove(id) { enqueue(() => restDelete(`bt_viagens?viagem_id=eq.${encodeURIComponent(id)}`)); },
  },
};

// ── API db.* (mesma interface que as telas já usam) ─────────────────────────
export const db = {
  all: () => cache,
  save: () => { persistLocal(); persistSnapshot(); },
  list: (col, pred) => { const a = cache[col] || []; return pred ? a.filter(pred) : a.slice(); },
  get: (col, id) => (cache[col] || []).find(x => x.id === id || x.id === realId(id)) || null,
  insert: (col, obj) => {
    if (!obj.id) obj.id = (CANON.has(col) ? 'tmp-' : '') + uid();
    (cache[col] = cache[col] || []).push(obj);
    if (REMOTE[col] && REMOTE[col].insert) { REMOTE[col].insert(obj); persistSnapshot(); }
    else persistLocal();
    return obj;
  },
  update: (col, id, patch) => {
    const o = db.get(col, id);
    if (o) {
      Object.assign(o, patch);
      if (REMOTE[col] && REMOTE[col].update) { REMOTE[col].update(o); persistSnapshot(); }
      else persistLocal();
    }
    return o;
  },
  remove: (col, id) => {
    const a = cache[col] || [];
    const i = a.findIndex(x => x.id === id || x.id === realId(id));
    if (i >= 0) {
      a.splice(i, 1);
      if (REMOTE[col] && REMOTE[col].remove) { REMOTE[col].remove(id); persistSnapshot(); }
      else persistLocal();
    }
  },
};

// ── check-in: wellness canônico + dor separada; prontidão volta DA VIEW ─────
// ck (escalas do app): sleepQuality/energy/humor 5=melhor · musclePain/stress 1=melhor
export async function saveCheckin(athleteId, ck) {
  const data = todayISO();
  await restUpsert('bt_monitoramento_diario', [{
    atleta_id: athleteId, data,
    sono_horas: ck.sleepHours, qualidade_sono: ck.sleepQuality, energia: ck.energy,
    recuperacao_muscular: 6 - ck.musclePain, // canônico: 5 = melhor
    tranquilidade: 6 - ck.stress,            // canônico: 5 = melhor
    humor: ck.humor,
  }]);
  if (ck.painScore > 0) { // dor é registro próprio, N por dia (bt_dor_registros)
    await restPost('bt_dor_registros', [{
      atleta_id: athleteId, data, regiao: ck.painLocation || 'não informada',
      intensidade_0a10: ck.painScore, altera_movimento: !!ck.alteraMovimento, em_impacto: !!ck.emImpacto,
    }], 'return=minimal');
  }
  const vr = await restGet(`bt_prontidao_v1?atleta_id=eq.${encodeURIComponent(athleteId)}&data=eq.${data}`);
  const p = vr && vr[0];
  const readiness = scaleReadiness(p ? p.prontidao : null);
  // atualiza o cache local
  const k = athleteId + '|' + data;
  cache.checkins = (cache.checkins || []).filter(c => c.id !== k);
  cache.checkins.push({
    id: k, athleteId, date: data, ...ck,
    prontidao: p ? p.prontidao : null, banda: p ? p.banda : null, readinessScore: readiness,
  });
  const a = db.get('athletes', athleteId);
  if (a) a.recoveryScore = readiness;
  persistSnapshot();
  syncOk();
  return { readiness, prontidao: p ? p.prontidao : null, banda: p ? p.banda : null };
}

// ── decisão da semana: 6 valores oficiais + evidências/inputs/versão ─────────
export function saveDecision(athleteId, { sugerida, final, note, confianca }) {
  const monday = mondayOf(todayISO());
  const raw = (cache.decisoesRaw || {})[athleteId];
  const decSug = sugerida || (raw && raw.decisao_sugerida) || final;
  const c = latestCheckin(athleteId);
  const wk = weekLoad(athleteId, monday), prevWk = weekLoad(athleteId, addDays(monday, -7));
  const nt = nextTournament(athleteId);
  const evidencias = [];
  if (c && c.prontidao != null) evidencias.push({ sinal: 'prontidao', valor: c.prontidao, banda: c.banda, regra: 'bt_prontidao_v1' });
  if (c && c.painScore > 0) evidencias.push({ sinal: 'dor', valor: c.painScore, regiao: c.painLocation || null });
  if (prevWk) evidencias.push({ sinal: 'razao_carga_semanal', valor: +(wk / prevWk).toFixed(2) });
  if (nt) evidencias.push({ sinal: 'proximo_torneio', valor: diffDays(nt.startDate, todayISO()), nome: nt.name });
  const row = {
    atleta_id: athleteId, semana_inicio: monday,
    decisao_sugerida: decSug, confianca: confianca || (raw && raw.confianca) || 'BAIXA',
    justificativa: note || null, evidencias,
    inputs: {
      prontidao: c ? c.prontidao : null, prontidao_versao: 'v1-subjetiva',
      carga_semana: wk, carga_semana_anterior: prevWk,
      dor_max: c ? c.painScore || 0 : 0,
      proximo_torneio: nt ? { nome: nt.name, em_dias: diffDays(nt.startDate, todayISO()) } : null,
    },
    versao_regras: 'app-mvp-v2 (decisão administrativa) / canonical v1.2',
    decisao_final: final, motivo_ajuste: final !== decSug ? (note || 'ajuste manual do treinador') : null,
    decidido_em: new Date().toISOString(),
  };
  cache.decisions[athleteId] = { decision: final, note: note || '', appliedAt: Date.now() };
  cache.decisoesRaw[athleteId] = { ...(raw || {}), ...row };
  persistSnapshot();
  return enqueue(() => restUpsert('bt_decisoes_semana', [row]));
}

// ── cálculos derivados (em memória, nunca gravados) ──────────────────────────
export function latestCheckin(athleteId) {
  return db.list('checkins', c => c.athleteId === athleteId).sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

export function nextTournament(athleteId) {
  const t = todayISO();
  return db.list('tournaments', x => (!athleteId || (x.athletes || []).includes(athleteId)) && x.startDate >= t)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] || null;
}

export function athleteStatus(a) {
  const c = latestCheckin(a.id);
  const r = c ? c.readinessScore : (a.recoveryScore || 0);
  if ((c && c.painScore >= 7) || a.status === 'INJURED') return 'INJURED';
  if (r > 0 && r < 65) return 'ATTENTION';
  const nt = nextTournament(a.id);
  if (nt && diffDays(nt.startDate, todayISO()) <= 7) return 'COMPETING_SOON';
  return 'READY';
}

export function recoveryOf(a) {
  const c = latestCheckin(a.id);
  return c ? c.readinessScore : (a.recoveryScore || 0);
}

export function sessionLoad(s) {
  if (s.status === 'COMPLETED' && s.rpeFinal) return Math.round((s.durationMinutes || 0) * s.rpeFinal);
  return s.plannedLoad || 0;
}

export function weekLoad(athleteId, weekStart) {
  const end = addDays(weekStart, 6);
  return db.list('sessions', s => s.athleteId === athleteId && s.date >= weekStart && s.date <= end && s.status !== 'SKIPPED')
    .reduce((sum, s) => sum + sessionLoad(s), 0);
}

export function streakDays(athleteId) {
  const done = new Set(db.list('sessions', s => s.athleteId === athleteId && s.status === 'COMPLETED').map(s => s.date));
  let n = 0, d = todayISO();
  if (!done.has(d)) d = addDays(d, -1); // streak pode terminar ontem
  while (done.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

export function teamReadiness() {
  const list = db.list('athletes').map(a => recoveryOf(a)).filter(r => r > 0);
  return list.length ? Math.round(list.reduce((s, r) => s + r, 0) / list.length) : 0;
}

export const STATUS_META = {
  READY: { color: '#34E0A1', label: 'Pronto p/ progredir' },
  ATTENTION: { color: '#FFC24B', label: 'Precisa de atenção' },
  COMPETING_SOON: { color: '#5B9DFF', label: 'Perto de competir' },
  INJURED: { color: '#FF5D5D', label: 'Lesionado' },
};
