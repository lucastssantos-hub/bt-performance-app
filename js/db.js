// db.js — camada de dados do MVP (localStorage estruturado).
// Troca futura: adaptador Supabase (schema pronto em supabase/001_schema_bt.sql).
// Modelos seguem docs/DADOS_E_MODELOS.md. Derivados (readiness, carga, status) são sempre calculados.

const KEY = 'btperf_db_v1';
const SES = 'btperf_session_v1';

export const uid = () => Math.random().toString(36).slice(2, 10);
export const iso = (d) => d.toISOString().slice(0, 10);
export const todayISO = () => iso(new Date());
export const addDays = (base, n) => { const d = new Date(base + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
export const dayN = (n) => addDays(todayISO(), n);
export const diffDays = (a, b) => Math.round((new Date(a + 'T12:00:00') - new Date(b + 'T12:00:00')) / 86400000);
export const mondayOf = (dateStr) => { const d = new Date(dateStr + 'T12:00:00'); const w = (d.getDay() + 6) % 7; return addDays(iso(d), -w); };

// ── seed ─────────────────────────────────────────────────────────────────────
function buildSeed() {
  const t = todayISO();
  const mon = mondayOf(t);
  const users = [
    { id: 'u-rafael', name: 'Rafael Costa', email: 'rafael@equipebrasil.com', password: '123456', role: 'TRAINER', avatarInitials: 'RC' },
    { id: 'u-joao', name: 'João Silva', email: 'joao@atleta.com', password: '123456', role: 'ATHLETE', avatarInitials: 'JS', athleteId: 'a-joao' },
  ];
  const athletes = [
    { id: 'a-joao', trainerId: 'u-rafael', name: 'João Silva', age: 28, category: 'Pro · BT', partnerName: 'Vitor Gomes', status: 'READY', recoveryScore: 88, notes: '#42 ranking ITF' },
    { id: 'a-marina', trainerId: 'u-rafael', name: 'Marina Teixeira', age: 25, category: 'Pro · BT', partnerName: 'Ana Castro', status: 'ATTENTION', recoveryScore: 54, notes: '' },
    { id: 'a-vitor', trainerId: 'u-rafael', name: 'Vitor Gomes', age: 30, category: 'Pro · BT', partnerName: 'João Silva', status: 'COMPETING_SOON', recoveryScore: 79, notes: '' },
    { id: 'a-lucasf', trainerId: 'u-rafael', name: 'Lucas Ferraz', age: 23, category: 'Pro · BT', partnerName: '—', status: 'ATTENTION', recoveryScore: 61, notes: 'Carga alta na última semana' },
    { id: 'a-ana', trainerId: 'u-rafael', name: 'Ana Castro', age: 26, category: 'Pro · BT', partnerName: 'Marina Teixeira', status: 'READY', recoveryScore: 84, notes: '' },
    { id: 'a-pedro', trainerId: 'u-rafael', name: 'Pedro Henrique', age: 27, category: 'Pro · BT', partnerName: '—', status: 'INJURED', recoveryScore: 0, notes: 'Entorse tornozelo D · retorno fase 2' },
  ];
  const assessments = [
    { id: uid(), athleteId: 'a-joao', date: dayN(-6), generalIndex: 81, cmj: 42, sprint10m: 1.74, agility505: 2.31, ankleMobility: 32, notes: 'Potência acima da meta. Mobilidade abaixo.' },
    { id: uid(), athleteId: 'a-joao', date: dayN(-48), generalIndex: 76, cmj: 39, sprint10m: 1.79, agility505: 2.36, ankleMobility: 36, notes: '' },
    { id: uid(), athleteId: 'a-marina', date: dayN(-12), generalIndex: 72, cmj: 31, sprint10m: 1.92, agility505: 2.48, ankleMobility: 38, notes: '' },
    { id: uid(), athleteId: 'a-vitor', date: dayN(-9), generalIndex: 78, cmj: 40, sprint10m: 1.78, agility505: 2.35, ankleMobility: 35, notes: '' },
  ];
  const ex = (n, name, sets, reps, intensity, rest) => ({ id: uid(), name, sets, reps, intensity, rest, order: n, status: 'PENDING' });
  const mkSession = (athleteId, date, title, type, location, dur, rpe, load, status, exercises = [], extra = {}) =>
    ({ id: uid(), athleteId, date, title, type, location, durationMinutes: dur, targetRpe: rpe, plannedLoad: load, status, notes: '', exercises, ...extra });
  const forcaExercises = () => [
    ex(0, 'Aquecimento + mobilidade', 1, '10 min', '—', '—'),
    ex(1, 'Agachamento livre', 4, '5', '80% 1RM', '2min'),
    ex(2, 'Levantamento terra romeno', 3, '8', 'moderada', '90s'),
    ex(3, 'Avanço com salto', 3, '10 cada', 'corporal', '60s'),
    ex(4, 'Panturrilha em pé', 4, '12', 'moderada', '45s'),
  ];
  // semana do João (espelha o protótipo); o dia de HOJE é sempre a sessão completa com exercícios
  const joaoWeek = [
    [mon, 'Força · MMII', 'Força', 'GYM', 62, 7, 620],
    [addDays(mon, 1), 'Potência · Pliometria', 'Potência', 'SAND', 45, 6, 410],
    [addDays(mon, 2), 'Regenerativo · Mobilidade', 'Regenerativo', 'RECOVERY', 30, 3, 120],
    [addDays(mon, 3), 'Força · Tronco + ombro', 'Força', 'GYM', 55, 7, 580],
  ].filter(([d]) => d !== t).map(([d, title, type, loc, dur, rpe, load]) =>
    mkSession('a-joao', d, title, type, loc, dur, rpe, load, diffDays(t, d) > 0 ? 'COMPLETED' : 'PLANNED', [], diffDays(t, d) > 0 ? { rpeFinal: rpe } : {}));
  const sessions = [
    ...joaoWeek,
    // sessão de HOJE garantida para o fluxo do atleta
    mkSession('a-joao', t, 'Força · Membros inferiores', 'Força', 'GYM', 60, 7, 620, 'PLANNED', forcaExercises()),
    // histórico (semanas anteriores) p/ gráfico de carga
    mkSession('a-joao', addDays(mon, -7), 'Força · MMII', 'Força', 'GYM', 60, 7, 600, 'COMPLETED', [], { rpeFinal: 7 }),
    mkSession('a-joao', addDays(mon, -6), 'Potência', 'Potência', 'SAND', 45, 6, 400, 'COMPLETED', [], { rpeFinal: 6 }),
    mkSession('a-joao', addDays(mon, -5), 'Quadra · Técnico', 'Quadra', 'SAND', 90, 6, 540, 'COMPLETED', [], { rpeFinal: 6 }),
    mkSession('a-joao', addDays(mon, -14), 'Força · MMII', 'Força', 'GYM', 60, 8, 640, 'COMPLETED', [], { rpeFinal: 8 }),
    mkSession('a-joao', addDays(mon, -13), 'Quadra · Tático', 'Quadra', 'SAND', 80, 7, 560, 'COMPLETED', [], { rpeFinal: 7 }),
    mkSession('a-joao', addDays(mon, -21), 'Força', 'Força', 'GYM', 55, 7, 520, 'COMPLETED', [], { rpeFinal: 7 }),
    // Marina e Vitor — algumas sessões
    mkSession('a-marina', mon, 'Quadra · Técnico', 'Quadra', 'SAND', 75, 7, 525, 'COMPLETED', [], { rpeFinal: 8 }),
    mkSession('a-marina', t, 'Regenerativo', 'Regenerativo', 'RECOVERY', 30, 3, 90, 'PLANNED'),
    mkSession('a-vitor', t, 'Ativação pré-torneio', 'Potência', 'SAND', 40, 5, 200, 'PLANNED'),
    mkSession('a-vitor', addDays(mon, 1), 'Força · manutenção', 'Força', 'GYM', 45, 6, 270, 'COMPLETED', [], { rpeFinal: 6 }),
  ];
  const checkins = [
    { id: uid(), athleteId: 'a-joao', date: t, sleepQuality: 5, sleepHours: 7.7, energy: 4, musclePain: 2, stress: 1, painLocation: '', painScore: 0, readinessScore: 88 },
    { id: uid(), athleteId: 'a-joao', date: dayN(-1), sleepQuality: 4, sleepHours: 7.2, energy: 4, musclePain: 2, stress: 2, painLocation: '', painScore: 0, readinessScore: 82 },
    { id: uid(), athleteId: 'a-marina', date: t, sleepQuality: 2, sleepHours: 5.2, energy: 2, musclePain: 3, stress: 3, painLocation: 'lombar', painScore: 3, readinessScore: 54 },
    { id: uid(), athleteId: 'a-vitor', date: t, sleepQuality: 4, sleepHours: 7.0, energy: 4, musclePain: 2, stress: 2, painLocation: '', painScore: 0, readinessScore: 79 },
    { id: uid(), athleteId: 'a-lucasf', date: t, sleepQuality: 3, sleepHours: 6.1, energy: 3, musclePain: 3, stress: 2, painLocation: '', painScore: 0, readinessScore: 61 },
    { id: uid(), athleteId: 'a-ana', date: t, sleepQuality: 4, sleepHours: 7.5, energy: 5, musclePain: 2, stress: 1, painLocation: '', painScore: 0, readinessScore: 84 },
    { id: uid(), athleteId: 'a-pedro', date: t, sleepQuality: 3, sleepHours: 6.5, energy: 3, musclePain: 2, stress: 2, painLocation: 'tornozelo D', painScore: 7, readinessScore: 40 },
  ];
  const tournaments = [
    { id: 'to-italia', name: 'Itália Open', location: 'Roma, IT', startDate: dayN(3), endDate: dayN(7), level: 'BT200', isMainTarget: false, athletes: ['a-joao', 'a-vitor'] },
    { id: 'to-madrid', name: 'Madrid Major', location: 'Madri, ES', startDate: dayN(17), endDate: dayN(21), level: 'BT400', isMainTarget: false, athletes: ['a-joao', 'a-vitor', 'a-ana', 'a-marina'] },
    { id: 'to-doha', name: 'Mundial · Doha', location: 'Catar', startDate: dayN(31), endDate: dayN(37), level: 'BT1000', isMainTarget: true, athletes: ['a-joao', 'a-vitor'] },
  ];
  const travels = [
    { id: uid(), tournamentId: 'to-italia', origin: 'GRU', destination: 'FCO', departureDate: dayN(2), arrivalDate: dayN(3), hotel: 'Hotel Quirinale · 14–18', notes: 'Fuso +5h · protocolo anti-jetlag enviado. Delegação: João, Vitor + Rafael.' },
  ];
  const notifications = [
    { id: uid(), userId: 'u-rafael', title: 'Marina T. reportou prontidão baixa', description: 'Sono 5h12 · dor lombar 3/10', type: 'alert', read: false, createdAt: Date.now() - 12 * 60000 },
    { id: uid(), userId: 'u-rafael', title: 'Avaliação física pendente · Lucas F.', description: 'Última avaliação há mais de 60 dias', type: 'warning', read: false, createdAt: Date.now() - 60 * 60000 },
    { id: uid(), userId: 'u-rafael', title: 'João S. completou o treino de força', description: 'RPE 7 · 62 min', type: 'success', read: true, createdAt: Date.now() - 3 * 3600000 },
    { id: uid(), userId: 'u-rafael', title: 'Viagem Itália Open em 3 dias', description: 'Confirme delegação e protocolos', type: 'travel', read: true, createdAt: Date.now() - 26 * 3600000 },
    { id: uid(), userId: 'u-rafael', title: 'Relatório semanal gerado', description: 'Equipe Brasil · semana passada', type: 'info', read: true, createdAt: Date.now() - 30 * 3600000 },
    { id: uid(), userId: 'u-joao', title: 'Nova mensagem do treinador', description: '"Capricha no agachamento hoje 💪"', type: 'message', read: false, createdAt: Date.now() - 2 * 3600000 },
  ];
  const messages = [
    { id: uid(), senderId: 'u-rafael', receiverId: 'u-joao', content: 'Bom dia! Vi que seu recovery tá em 88. Hoje vamos progredir a carga 💪', createdAt: Date.now() - 5 * 3600000, read: true },
    { id: uid(), senderId: 'u-rafael', receiverId: 'u-joao', content: 'Capricha no agachamento. Foco na profundidade.', createdAt: Date.now() - 5 * 3600000 + 60000, read: true },
    { id: uid(), senderId: 'u-joao', receiverId: 'u-rafael', content: 'Show! Tô me sentindo muito bem hoje. Bora 🔥', createdAt: Date.now() - 4.8 * 3600000, read: true },
    { id: uid(), senderId: 'u-rafael', receiverId: 'u-joao', content: 'Perfeito. Depois me manda o RPE de cada bloco 👊', createdAt: Date.now() - 4.7 * 3600000, read: false },
  ];
  const reports = [
    { id: uid(), athleteId: 'a-joao', title: 'Relatório individual · João S.', type: 'individual', createdAt: Date.now() - 2 * 3600000, content: 'Semana sólida: prontidão média 85, carga dentro da faixa, 3 sessões concluídas.' },
    { id: uid(), athleteId: null, title: 'Carga da equipe · semana atual', type: 'equipe', createdAt: Date.now() - 3 * 3600000, content: 'Carga total da equipe equilibrada; 2 atletas pedem ajuste.' },
    { id: uid(), athleteId: null, title: 'Evolução mensal · mês passado', type: 'mensal', createdAt: Date.now() - 3 * 86400000, content: 'Prontidão média subiu 8% no mês; zero lesões novas.' },
  ];
  const settings = { pushEnabled: true, units: 'métrico' };
  const decisions = {}; // por atleta: { decision, note, appliedAt }
  return { users, athletes, assessments, checkins, sessions, tournaments, travels, notifications, messages, reports, settings, decisions };
}

// ── persistência ─────────────────────────────────────────────────────────────
let cache = null;
function load() {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(KEY)); } catch (e) { cache = null; }
  if (!cache || !cache.users) { cache = buildSeed(); persist(); }
  return cache;
}
function persist() { localStorage.setItem(KEY, JSON.stringify(cache)); }

export const db = {
  all: () => load(),
  save: () => persist(),
  reset: () => { localStorage.removeItem(KEY); cache = null; load(); },
  list: (col, pred) => { const a = load()[col] || []; return pred ? a.filter(pred) : a.slice(); },
  get: (col, id) => (load()[col] || []).find(x => x.id === id) || null,
  insert: (col, obj) => { if (!obj.id) obj.id = uid(); load()[col].push(obj); persist(); return obj; },
  update: (col, id, patch) => { const o = db.get(col, id); if (o) { Object.assign(o, patch); persist(); } return o; },
  remove: (col, id) => { const a = load()[col]; const i = a.findIndex(x => x.id === id); if (i >= 0) { a.splice(i, 1); persist(); } },
};

// ── sessão (auth) ────────────────────────────────────────────────────────────
export const auth = {
  login(email, password) {
    const u = db.list('users').find(u => u.email.toLowerCase() === String(email).trim().toLowerCase());
    if (!u || u.password !== password) return null;
    localStorage.setItem(SES, JSON.stringify({ userId: u.id }));
    return u;
  },
  current() {
    try { const s = JSON.parse(localStorage.getItem(SES)); return s ? db.get('users', s.userId) : null; } catch (e) { return null; }
  },
  logout() { localStorage.removeItem(SES); },
};

// ── cálculos simples do MVP (sem motor de treino) ────────────────────────────
export function readinessFrom(c) {
  // escalas 1–5: sleepQuality/energy (5 = melhor), musclePain/stress (1 = melhor)
  let r = 100;
  r -= (5 - c.sleepQuality) * 6;
  if (c.sleepHours < 6) r -= 10; else if (c.sleepHours < 7) r -= 5;
  r -= (5 - c.energy) * 5;
  r -= (c.musclePain - 1) * 6;
  r -= (c.stress - 1) * 5;
  if (c.painScore >= 7) r -= 25; else if (c.painScore >= 4) r -= 12; else if (c.painScore >= 1) r -= 5;
  return Math.max(0, Math.min(100, Math.round(r)));
}

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
  if (r < 65) return 'ATTENTION';
  const nt = nextTournament(a.id);
  if (nt && diffDays(nt.startDate, todayISO()) <= 7) return 'COMPETING_SOON';
  if (r >= 80) return 'READY';
  return 'READY';
}

export function recoveryOf(a) {
  const c = latestCheckin(a.id);
  return c ? c.readinessScore : (a.recoveryScore || 0);
}

export function sessionLoad(s) {
  if (s.status === 'COMPLETED' && s.rpeFinal) return Math.round(s.durationMinutes * s.rpeFinal);
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
