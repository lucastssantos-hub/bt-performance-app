// app.js — router de pilha + despachante de ações + formulários (modais)
import { db, auth, syncRemote, ready, saveCheckin, saveDecision, saveAnamnese, uid, todayISO, addDays, mondayOf, latestCheckin, weekLoad, recoveryOf, athleteStatus, nextTournament, diffDays, sessionLoad, teamReadiness, EXERCISE_LIBRARY, EXERCISE_GROUP_LABELS } from './db.js';
import { toast, openModal, closeModal, confirmDialog, field, input, select, textarea, esc, fmtShort } from './ui.js';
import * as C from './screens-coach.js';
import * as A from './screens-athlete.js';
import { invokeFunction, invokePublicFunction } from './remote.js';
import { analyzeAthleteWeek } from './decision-engine.js';

const NAV_KEY = 'btperf_nav_v1';
const screens = {
  login: A.login, athleteSignup: A.signup,
  coachDash: C.coachDash, coachAthletes: C.coachAthletes, coachProfile: C.coachProfile,
  coachAssessment: C.coachAssessment, coachHistory: C.coachHistory, coachPlan: C.coachPlan,
  coachDecision: C.coachDecision, coachRadar: C.coachRadar, coachRadarDetail: C.coachRadarDetail,
  coachReports: C.coachReports, coachCalendar: C.coachCalendar,
  coachTravels: C.coachTravels, coachNotifications: C.coachNotifications, coachSettings: C.coachSettings,
  coachCopiloto: C.coachCopiloto, coachMicrociclo: C.coachMicrociclo,
  athleteHome: A.athleteHome, athleteWellness: A.athleteWellness, athleteWorkout: A.athleteWorkout,
  athleteTournament: A.athleteTournament, athleteRecovery: A.athleteRecovery, athleteHistory: A.athleteHistory,
  athleteMessages: A.athleteMessages, athleteProfile: A.athleteProfile,
};

const state = { stack: ['login'], ctx: {} };
try { const saved = JSON.parse(sessionStorage.getItem(NAV_KEY)); if (saved && saved.stack && screens[saved.stack[saved.stack.length - 1]]) Object.assign(state, saved); } catch (e) { /* primeira visita */ }
if (!auth.current()) state.stack = ['login'];
else if (state.stack[state.stack.length - 1] === 'login') state.stack = [auth.current().role === 'TRAINER' ? 'coachDash' : 'athleteHome'];

const cur = () => state.stack[state.stack.length - 1];
function render() {
  const root = document.getElementById('screen-root');
  // logado mas ainda sem cache hidratado do Supabase: tela de carregamento até o syncRemote
  if (auth.current() && !ready() && cur() !== 'login') {
    root.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;color:#8A94A3;font-size:14px;">
      <div style="width:46px;height:46px;border-radius:14px;background:#FF6A3D;display:flex;align-items:center;justify-content:center;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 13.5C8 17 12 18 19 16" stroke="#0B0E12" stroke-width="2.6" stroke-linecap="round"/><circle cx="8.5" cy="8" r="3.4" stroke="#0B0E12" stroke-width="2.6"/></svg></div>
      Carregando seus dados…</div>`;
    return;
  }
  try {
    root.innerHTML = `<div class="screenfade" style="position:absolute;inset:0;overflow-y:auto;">${screens[cur()](state.ctx)}</div>`;
  } catch (err) {
    console.error(err);
    root.innerHTML = `<div style="padding:80px 30px;text-align:center;color:#8A94A3;font-size:14px;">Algo deu errado nesta tela. <div class="tap" data-action="tab" data-screen="${auth.current() ? (auth.current().role === 'TRAINER' ? 'coachDash' : 'athleteHome') : 'login'}" style="color:#FF6A3D;font-weight:700;margin-top:12px;">Voltar para o início</div></div>`;
  }
  sessionStorage.setItem(NAV_KEY, JSON.stringify({ stack: state.stack, ctx: { athleteId: state.ctx.athleteId } }));
  bindInputs();
  const ms = document.getElementById('msg-scroll');
  if (ms) ms.scrollTop = ms.scrollHeight;
}
function go(id) { state.stack.push(id); history.pushState({ i: state.stack.length }, ''); render(); }
function tab(id) { state.stack = [id]; history.pushState({ i: 1 }, ''); render(); }
function back() { if (state.stack.length > 1) { state.stack.pop(); render(); } else history.length > 1 && history.back(); }
window.addEventListener('popstate', () => { if (state.stack.length > 1) { state.stack.pop(); render(); } });

// inputs que precisam de listeners diretos (busca, sliders, selects)
function bindInputs() {
  const search = document.getElementById('athlete-search');
  if (search) search.addEventListener('input', (e) => {
    state.ctx.athleteSearch = e.target.value;
    const pos = e.target.selectionStart; render();
    const s2 = document.getElementById('athlete-search'); s2.focus(); s2.setSelectionRange(pos, pos);
  });
  const planAth = document.getElementById('plan-athlete');
  if (planAth) planAth.addEventListener('change', (e) => { state.ctx.athleteId = e.target.value; render(); });
  const hours = document.getElementById('ck-hours');
  if (hours) hours.addEventListener('input', (e) => { state.ctx.checkin.sleepHours = +e.target.value; render(); });
  const painloc = document.getElementById('ck-painloc');
  if (painloc) painloc.addEventListener('change', (e) => { state.ctx.checkin.painLocation = e.target.value; });
  const painscore = document.getElementById('ck-painscore');
  if (painscore) painscore.addEventListener('change', (e) => { state.ctx.checkin.painScore = Math.max(0, Math.min(10, +e.target.value || 0)); render(); });
  const msgIn = document.getElementById('msg-input');
  if (msgIn) msgIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') actions['msg-send'](); });
  const copAthleteEl = document.getElementById('copiloto-athlete');
  if (copAthleteEl) copAthleteEl.addEventListener('change', (e) => {
    state.ctx.copilotoAthleteId = e.target.value;
    state.ctx.copilotoResult = ''; state.ctx.copilotoApproved = false;
    render();
  });
  const copCtxEl = document.getElementById('copiloto-context');
  if (copCtxEl) copCtxEl.addEventListener('input', (e) => {
    state.ctx.copilotoContext = e.target.value;
    const SINAIS = ['dor','machucou','lesionou','travou','fisioterapeuta','médico','cirurgia','inflama','inchou','não aguenta','ruptura','fratura'];
    const found = SINAIS.filter(s => e.target.value.toLowerCase().includes(s));
    const warnEl = document.getElementById('copiloto-block-warn');
    const termsEl = document.getElementById('copiloto-block-terms');
    if (warnEl) warnEl.style.display = found.length ? 'flex' : 'none';
    if (termsEl && found.length) termsEl.textContent = 'Termos: ' + found.map(s => `"${s}"`).join(', ') + ' → apenas A5, A6A ou B7.';
  });
}

// ── copiloto de sessão ────────────────────────────────────────────────────────
// O prompt de verdade fica no servidor (supabase/functions/copiloto-treino/index.ts,
// chave da Groq em Supabase Secrets). Este arquivo só revalida a resposta.

async function callCopiloto(userPrompt) {
  const data = await invokeFunction('copiloto-treino', { userPrompt });
  if (!data || typeof data.result !== 'string') throw new Error('Resposta inválida do copiloto');
  return data.result;
}

// 13 códigos (decisão 2026-08-15, docs/TEMPLATES_PRESCRICAO_V1.md): A6 dividiu
// em A6A/A6B; B5 fundiu em B2 e não é mais código próprio.
const COPILOTO_SESSION_CODES = new Set(['A1','A2','A3','A4','A5','A6A','A6B','B1','B2','B3','B4','B6','B7']);
// Espelho exato de conhecimento/motor-prescricao.md §6 (biblioteca fechada) —
// mantido em sincronia com o mesmo array em supabase/functions/copiloto-treino/index.ts.
const COPILOTO_EXERCISES = new Set([
  'estabilidade lateral ajoelhado','estabilidade lateral em pé','cortador ajoelhado',
  'prancha semiajoelhada','prancha no chão','prancha na bola','prancha no slide',
  'ponte na bola','flexão de joelhos na bola','flexão de joelhos no slide',
  'goblet squat','double front squat','agachamento com barra',
  'passada simples','passada 2 steps','passada com suspensão',
  'terra kettlebell','terra hexagonal','terra com barra',
  'apoio','supino halter','supino com barra',
  'empurrar barra semiajoelhado','supino inclinado','double press',
  'face pull','puxada inclinada','barra fixa',
  'arremesso med ball af semiajoelhado','arremesso med ball af em pé',
  'arremesso med ball af base contralateral','arremesso med ball ac semiajoelhado',
  'arremesso med ball ac em pé','arremesso med ball ac base contralateral',
  'pogo jump vertical','pogo jump lateral','pogo jump frente/trás','pogo jump unilateral',
  'queda no solo bilateral','queda no solo assimétrica','queda da caixa bilateral','queda da caixa assimétrica',
  'hop linear dc','hop linear contínuo','hop lateral contínuo',
  'bound contínuo','bound lateral dp','bound contínuo com sobrecarga',
  'drop vertical bilateral','drop vertical barreira','drop diagonal barreira',
  'load and lift','load and lift com alternância de pernas','marcha contra a parede',
  'marcha à frente com resistência','skip com resistência','bound com resistência',
  'corrida resistida','utilização de trenós',
  'lateral shuffle','double shuffle','cut and shuffle','lateral shuffle contínuo',
  'lean and crossover','crossover potente','cut and crossover',
]);
// A IA às vezes anexa um qualificador de dose ao nome do exercício em vez de
// deixar só na coluna Esquema (ex.: "goblet squat leve (máxima velocidade)").
// Normaliza removendo qualquer parêntese e qualificador solto no final antes
// de comparar com a biblioteca fechada — sem isso, sessão correta era
// rejeitada por um detalhe de formatação, não por exercício inventado de
// verdade.
const normalizeExercise = (value) => String(value || '')
  .replace(/\*\*/g, '')
  .replace(/\s*\([^)]*\)\s*/g, ' ')
  .replace(/\s+(leve|leves|fácil|fáceis|pesad[oa]s?|moderad[oa]s?|reps?)\s*$/gi, '')
  .trim().toLowerCase().replace(/\s+/g, ' ');

function validateCopilotoResult(result, { checkin, contextText }) {
  const code = (result.match(/^#\s+Sessão\s+(A[1-5]|A6[AB]|B[1-4]|B6|B7)\b/im) || [])[1]?.toUpperCase();
  if (!code || !COPILOTO_SESSION_CODES.has(code)) return { ok: false, error: 'A resposta não contém um código de sessão válido (A1–A5, A6A, A6B ou B1–B4, B6, B7).' };
  const duration = +(result.match(/Duração estimada:\*\*?\s*(\d+)/i) || [])[1];
  if (!duration || duration < 15 || duration > 120) return { ok: false, error: 'A duração precisa estar explícita e entre 15 e 120 minutos.' };
  const rows = result.split('\n').filter(line => /^\|.+\|$/.test(line) && !/^\|[\s\-:|]+\|$/.test(line));
  const exercises = rows.slice(1).map((line, index) => {
    const cells = line.slice(1, -1).split('|').map(cell => cell.trim());
    const scheme = cells[1] || '';
    const dose = scheme.match(/(\d+)\s*[x×]\s*([^.·|]+)/i);
    const rest = scheme.match(/(?:descanso|recuperação)\s*:? ?([^.·|]+)/i);
    return {
      id: `ia-${index + 1}`, name: cells[0].replace(/\*\*/g, ''), scheme,
      sets: dose ? Number(dose[1]) : 1, reps: dose ? dose[2].trim() : scheme,
      rest: rest ? rest[1].trim() : '', stopCriteria: cells[2] || '', safetyNote: cells[3] || '',
      status: 'PENDING', order: index,
    };
  }).filter(exercise => exercise.name && normalizeExercise(exercise.name) !== 'exercício');
  if (!exercises.length) return { ok: false, error: 'Nenhum exercício estruturado foi encontrado na tabela da sessão.' };
  const invented = exercises.filter(exercise => !COPILOTO_EXERCISES.has(normalizeExercise(exercise.name)));
  if (invented.length) return { ok: false, error: `Exercício fora da biblioteca: ${invented.map(e => e.name).join(', ')}.` };
  const blockingTerms = ['dor','machucou','lesionou','travou','fisioterapeuta','médico','cirurgia','inflama','inchou','não aguenta','ruptura','fratura'];
  const textBlock = blockingTerms.some(term => String(contextText || '').toLowerCase().includes(term));
  const clinicalBlock = !!checkin && (checkin.painScore >= 6 || checkin.alteraMovimento);
  if ((textBlock || clinicalBlock) && !['A5','A6A','B7'].includes(code)) {
    return { ok: false, error: `Bloqueio clínico ativo: a sessão ${code} não é segura. Use somente A5, A6A ou B7 e encaminhe para avaliação profissional.` };
  }
  return { ok: true, code, duration, exercises };
}

function buildCopilotoPrompt(a, c, nt, assess, recentSessions, wkCurrent, wkPrev, contextText, analysis) {
  const daysTo = nt ? diffDays(nt.startDate, todayISO()) : null;
  const weekType = !nt ? 'TREINO' : daysTo <= 0 ? 'COMPETIÇÃO' : daysTo <= 3 ? 'PRÉ-COMPETIÇÃO' : daysTo <= 7 ? 'PRÉ-COMPETIÇÃO' : 'TREINO';
  return [
    `Atleta: ${a.name}${a.age ? ' (' + a.age + ' anos)' : ''}`,
    `Data de hoje: ${todayISO()}`,
    '',
    '## Estado atual',
    `Prontidão: ${c && c.prontidao != null ? c.prontidao + '/25 (banda: ' + (c.banda || '?') + ')' : 'sem check-in recente'}`,
    `Dor: ${c ? (c.painScore > 0 ? c.painScore + '/10 em ' + (c.painLocation || 'região?') + (c.alteraMovimento ? ' — ALTERA MOVIMENTO' : '') : '0/10 — sem dor') : 'sem check-in recente'}`,
    `Último check-in: ${c ? c.date : 'nenhum'}`,
    '',
    '## Calendário',
    `Tipo de semana: ${weekType}`,
    `Próximo torneio: ${nt ? nt.name + ' · ' + nt.startDate + ' · em ' + daysTo + ' dias (prioridade ' + (nt.isMainTarget ? 'A' : 'B') + ')' : 'nenhum cadastrado'}`,
    '',
    '## Avaliação física',
    assess ? [
      `Data: ${assess.date}`,
      `CMJ: ${assess.cmj}cm · SJ: ${assess.sj}cm (CMJ/SJ: ${assess.sj > 0 ? (assess.cmj/assess.sj).toFixed(2) : '—'})`,
      `Sprint 5m: ${assess.sprint5m}s · Sprint 10m: ${assess.sprint10m}s`,
      `MB Lateral D: ${assess.mbLateralD}m · E: ${assess.mbLateralE}m (assimetria: ${assess.mbAsym}%)`,
      assess.agility505 ? `5-0-5 areia: ${assess.agility505}s` : '',
    ].filter(Boolean).join('\n') : 'Sem avaliação cadastrada.',
    '',
    '## Sessões recentes',
    recentSessions.length ? recentSessions.slice(0, 5).map(s =>
      `${s.date}: ${s.title} (${s.type} · ${s.durationMinutes}min · RPE ${s.status === 'COMPLETED' ? s.rpeFinal : s.targetRpe} · ${sessionLoad(s)} UA)`
    ).join('\n') : 'Nenhuma sessão registrada.',
    '',
    `Carga semana atual: ${wkCurrent} UA${wkPrev ? ' · semana anterior: ' + wkPrev + ' UA (ratio: ' + (wkPrev > 0 ? (wkCurrent/wkPrev).toFixed(2) : '—') + ')' : ''}`,
    '',
    '## Radar de decisão determinístico',
    `Decisão da Semana vigente: ${analysis.decision}`,
    `Confiança dos dados: ${analysis.confidence}`,
    `Categoria: ${analysis.category} · risco competitivo: ${analysis.competitiveRisk}`,
    `Sinais: ${analysis.signals.length ? analysis.signals.map(s => `${s.type} (${s.severity}: ${s.numbers})`).join('; ') : 'nenhum sinal adicional'}`,
    `Dados faltantes: ${analysis.missing.length ? analysis.missing.join('; ') : 'nenhum'}`,
    contextText ? '\n## Contexto adicional do treinador\n' + contextText : '',
    '',
    'Gere a sessão física para hoje seguindo o motor do BT Performance Lab.',
  ].filter(l => l !== null && l !== undefined).join('\n').trim();
}

// ── microciclo (semana inteira) ───────────────────────────────────────────────
// escolhe até n dias entre segunda e domingo sem sessão já planejada, sem
// viagem e sem torneio do próprio atleta cobrindo o dia — nunca sobrescreve
// nem empilha em cima do que já existe no plano.
function pickMicrocicloDays(athleteId, monday, n) {
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const busy = new Set();
  db.list('sessions', s => s.athleteId === athleteId).forEach(s => busy.add(s.date));
  db.list('travels', t => t.athleteId === athleteId).forEach(t => {
    for (let d = t.departureDate; d <= t.arrivalDate; d = addDays(d, 1)) busy.add(d);
  });
  db.list('tournaments', t => (t.athletes || []).includes(athleteId)).forEach(t => {
    for (let d = t.startDate; d <= t.endDate; d = addDays(d, 1)) busy.add(d);
  });
  const free = week.filter(d => !busy.has(d));
  if (free.length <= n) return free;
  // distribui os n dias o mais espaçado possível dentro dos livres, em vez de
  // pegar os n primeiros (evita dois treinos físicos colados sem necessidade).
  const step = free.length / n;
  const chosen = [];
  for (let i = 0; i < n; i++) chosen.push(free[Math.min(free.length - 1, Math.round(i * step))]);
  return [...new Set(chosen)];
}

function buildMicrocicloPrompt(a, c, date, dayIndex, totalDays, priorCodes, analysis, weekTravels, weekTournaments) {
  const viagemHoje = weekTravels.find(t => date >= t.departureDate && date <= t.arrivalDate);
  const torneioHoje = weekTournaments.find(t => date >= t.startDate && date <= t.endDate);
  const nt = torneioHoje || null;
  const daysTo = nt ? diffDays(nt.startDate, date) : null;
  return [
    `Atleta: ${a.name}${a.age ? ' (' + a.age + ' anos)' : ''}`,
    `Data desta sessão: ${date} (dia ${dayIndex} de ${totalDays} do microciclo)`,
    '',
    '## Estado no início do microciclo',
    `Prontidão: ${c && c.prontidao != null ? c.prontidao + '/25 (banda: ' + (c.banda || '?') + ')' : 'sem check-in recente'}`,
    `Dor: ${c ? (c.painScore > 0 ? c.painScore + '/10 em ' + (c.painLocation || 'região?') + (c.alteraMovimento ? ' — ALTERA MOVIMENTO' : '') : '0/10 — sem dor') : 'sem check-in recente'}`,
    `Decisão da Semana vigente: ${analysis.decision} (confiança ${analysis.confidence})`,
    '',
    '## Anamnese do atleta (preenchida por ele mesmo — dado real, não assumir além disso)',
    `Disponibilidade semanal declarada: ${a.disponibilidadeSemanal != null ? a.disponibilidadeSemanal + 'x/semana' : 'não informada'}`,
    `Acesso a academia: ${a.acessoAcademia === true ? 'sim' : a.acessoAcademia === false ? 'não' : 'não informado'}`,
    `Acesso a areia/quadra: ${a.acessoAreia === true ? 'sim' : a.acessoAreia === false ? 'não' : 'não informado'}`,
    `Experiência com treino de força: ${a.experienciaForca || 'não informada'}`,
    `Tolerância a pliometria: ${a.toleranciaPlio || 'não informada'}`,
    a.objetivo ? `Objetivo relatado pelo atleta: ${a.objetivo}` : '',
    '',
    '## Contexto deste dia específico',
    viagemHoje ? `VIAGEM neste dia: ${viagemHoje.origin || '?'} → ${viagemHoje.destination} (${viagemHoje.departureDate} a ${viagemHoje.arrivalDate}).` : 'Sem viagem neste dia.',
    torneioHoje ? `TORNEIO neste dia: ${torneioHoje.name}, em ${daysTo} dia(s) do início (prioridade ${torneioHoje.isMainTarget ? 'A' : 'B'}).` : 'Sem torneio neste dia.',
    '',
    '## Sessões já geradas neste mesmo microciclo (não repita a mesma capacidade em excesso; varie)',
    priorCodes.length ? priorCodes.map((code, i) => `Dia ${i + 1}: ${code}`).join('\n') : 'Nenhuma ainda — esta é a primeira sessão do microciclo.',
    '',
    a.acessoAcademia === false ? 'RESTRIÇÃO: sem acesso a academia — use apenas códigos de areia (B1-B4, B6, B7) ou centro do corpo sem equipamento.' : '',
    a.acessoAreia === false ? 'RESTRIÇÃO: sem acesso a areia/quadra — use apenas códigos de academia (A1-A5, A6A, A6B).' : '',
    '',
    `Gere a sessão física para ${date} seguindo o motor do BT Performance Lab.`,
  ].filter(l => l !== null && l !== undefined).join('\n').trim();
}

// ── formulários ──────────────────────────────────────────────────────────────
const athleteOptions = (sel) => db.list('athletes').map(a => [a.id, a.name]).map(([v, l]) => [v, l]);

function formAssessment() {
  const a = db.get('athletes', state.ctx.athleteId) || db.list('athletes')[0];
  openModal(`Nova avaliação · ${a.name.split(' ')[0]}`, [
    field('Data', input('date', { type: 'date', value: todayISO() })),
    `<div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:#FF6A3D;margin:6px 0 2px;">SALTOS (obrigatório)</div>`,
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">`,
    field('CMJ (cm)', input('cmj', { type: 'number', step: '0.1', min: 0 })),
    field('SJ (cm)', input('sj', { type: 'number', step: '0.1', min: 0 })),
    `</div>`,
    `<div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:#FF6A3D;margin:10px 0 2px;">SPRINTS (obrigatório)</div>`,
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">`,
    field('Sprint 5m (s)', input('sprint5m', { type: 'number', step: '0.01', min: 0 })),
    field('Sprint 10m (s)', input('sprint10m', { type: 'number', step: '0.01', min: 0 })),
    `</div>`,
    `<div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:#FF6A3D;margin:10px 0 2px;">MB LATERAL 3kg — assimetria (obrigatório)</div>`,
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">`,
    field('MB Lateral D (m)', input('mbLateralD', { type: 'number', step: '0.01', min: 0 })),
    field('MB Lateral E (m)', input('mbLateralE', { type: 'number', step: '0.01', min: 0 })),
    `</div>`,
    `<div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:#8A94A3;margin:10px 0 2px;">OPCIONAIS</div>`,
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">`,
    field('5-0-5 areia (s)', input('agility505', { type: 'number', step: '0.01', min: 0, required: false })),
    field('Mob. tornozelo (°)', input('ankleMobility', { type: 'number', step: '1', min: 0, required: false })),
    `</div>`,
    field('Observações', textarea('notes', { placeholder: 'opcional' })),
  ].join(''), {
    onSubmit(d) {
      const cmj = +d.cmj, sj = +d.sj, spr5 = +d.sprint5m, spr10 = +d.sprint10m;
      const mbD = +d.mbLateralD, mbE = +d.mbLateralE;
      const agi = +d.agility505 || 0, ank = +d.ankleMobility || 0;
      if (!cmj) return toast('CMJ obrigatório.', 'err');
      if (!sj) return toast('SJ obrigatório.', 'err');
      if (!spr5) return toast('Sprint 5m obrigatório.', 'err');
      if (!spr10) return toast('Sprint 10m obrigatório.', 'err');
      if (!mbD || !mbE) return toast('MB Lateral D e E obrigatórios.', 'err');
      if (sj && cmj && sj > cmj) return toast('SJ maior que CMJ — confira a coleta (canônico §6).', 'err');
      const mbAsym = mbD && mbE ? Math.round(Math.abs(mbD - mbE) / Math.max(mbD, mbE) * 100) : 0;
      const generalIndex = Math.max(0, Math.min(100, Math.round(
        cmj * 1.0 + (2.4 - spr10) * 35 + (1.4 - spr5) * 30 + ((mbD + mbE) / 2) * 3 - mbAsym * 0.5
      )));
      db.insert('assessments', { id: `${a.id}-${d.date}`, athleteId: a.id, date: d.date, generalIndex,
        cmj, sj, sprint5m: spr5, sprint10m: spr10, mbLateralD: mbD, mbLateralE: mbE, mbAsym,
        agility505: agi, ankleMobility: ank, notes: d.notes || '' });
      closeModal(); toast('Avaliação salva'); render();
    }
  });
}

// segura o id da sessão em edição enquanto o modal fica aberto — sem isso,
// reabrir o modal a cada +/- exercício (formSession(null, ...)) perderia a
// referência e "editar" viraria "inserir outra sessão" por engano.
let sessionFormExistingId = null;

// biblioteca fechada agrupada — mesmo catálogo que o Copiloto usa, nunca
// texto livre (motor-prescricao.md §6: "a IA não pode criar exercício novo",
// vale igual pra sessão montada manualmente pelo treinador).
const exerciseOptionsHtml = (selected) => {
  const byGroup = {};
  EXERCISE_LIBRARY.forEach(e => (byGroup[e.grupo] = byGroup[e.grupo] || []).push(e));
  return Object.entries(byGroup).map(([g, list]) =>
    `<optgroup label="${esc(EXERCISE_GROUP_LABELS[g] || g)}">${list.map(e =>
      `<option value="${esc(e.nome)}" ${e.nome === selected ? 'selected' : ''}>${esc(e.nome)}</option>`).join('')}</optgroup>`
  ).join('');
};
const exerciseRowHtml = (ex, i) => `
  <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;">
    <select class="f-input" name="ex_name_${i}" style="flex:2;min-width:0;">${exerciseOptionsHtml(ex.name)}</select>
    <input class="f-input" name="ex_sets_${i}" type="number" min="1" value="${ex.sets || 3}" placeholder="séries" style="flex:0 0 56px;">
    <input class="f-input" name="ex_reps_${i}" type="text" value="${esc(ex.reps ?? '10')}" placeholder="reps" style="flex:0 0 56px;">
    <div class="tap" data-action="session-ex-remove" data-arg="${i}" style="flex:0 0 26px;text-align:center;color:#FF5D5D;font-size:16px;">✕</div>
  </div>`;

function captureSessionDraft(form) {
  const d = Object.fromEntries(new FormData(form).entries());
  const exercises = [];
  for (let i = 0; d[`ex_name_${i}`] !== undefined; i++) {
    exercises.push({ name: d[`ex_name_${i}`], sets: +d[`ex_sets_${i}`] || 3, reps: d[`ex_reps_${i}`] || '10' });
  }
  return {
    athleteId: d.athleteId, date: d.date, title: d.title, type: d.type, location: d.location,
    durationMinutes: +d.durationMinutes || 60, targetRpe: +d.targetRpe || 7,
    plannedLoad: +d.plannedLoad || 0, notes: d.notes || '', exercises,
  };
}

function formSession(existing, presetDate, draft) {
  if (!draft) sessionFormExistingId = existing ? existing.id : null;
  const existingId = sessionFormExistingId;
  const a = db.get('athletes', state.ctx.athleteId) || db.list('athletes')[0];
  const base = existing || { athleteId: a.id, date: presetDate || todayISO(), title: '', type: 'Força', location: 'GYM', durationMinutes: 60, targetRpe: 7, plannedLoad: 0, notes: '', exercises: [] };
  const s = draft ? { ...base, ...draft } : base;
  const exercises = (s.exercises && s.exercises.length) ? s.exercises : [{ name: EXERCISE_LIBRARY[0].nome, sets: 3, reps: '10' }];
  openModal(existingId ? 'Editar sessão' : 'Nova sessão', [
    field('Atleta', select('athleteId', athleteOptions(), s.athleteId)),
    field('Data', input('date', { type: 'date', value: s.date })),
    field('Título', input('title', { value: s.title, placeholder: 'ex: Força · MMII' })),
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">`,
    field('Tipo', select('type', ['Força', 'Potência', 'Quadra', 'Regenerativo'], s.type)),
    field('Local', select('location', [['GYM', 'Academia'], ['SAND', 'Areia'], ['RECOVERY', 'Recovery'], ['TRAVEL', 'Viagem']], s.location)),
    field('Duração (min)', input('durationMinutes', { type: 'number', value: s.durationMinutes, min: 5 })),
    field('RPE alvo', input('targetRpe', { type: 'number', value: s.targetRpe, min: 1, max: 10 })),
    `</div>`,
    field('Carga planejada (UA)', input('plannedLoad', { type: 'number', value: s.plannedLoad || Math.round(s.durationMinutes * s.targetRpe), min: 0, required: false })),
    `<label class="f-label">Exercícios (biblioteca fechada)</label>`,
    exercises.map((ex, i) => exerciseRowHtml(ex, i)).join(''),
    `<div class="tap" data-action="session-ex-add" style="color:#FF6A3D;font-size:13.5px;font-weight:700;margin-bottom:14px;">+ Adicionar exercício</div>`,
    existingId ? `<button type="button" class="tap btn-dark" data-action="session-delete" data-arg="${existingId}" style="margin-top:14px;color:#FF5D5D;">Remover sessão</button>` : '',
  ].join(''), {
    onSubmit(d, form) {
      const draft = captureSessionDraft(form);
      const exercises = draft.exercises.map((e, i) => ({ id: uid(), name: e.name, sets: e.sets, reps: e.reps, intensity: '', rest: '', order: i, status: 'PENDING' }));
      const patch = { athleteId: draft.athleteId, date: draft.date, title: draft.title, type: draft.type, location: draft.location, durationMinutes: draft.durationMinutes, targetRpe: draft.targetRpe, plannedLoad: draft.plannedLoad || Math.round(draft.durationMinutes * draft.targetRpe), notes: draft.notes, exercises };
      if (existingId) db.update('sessions', existingId, patch);
      else db.insert('sessions', { ...patch, status: 'PLANNED' });
      closeModal(); toast(existingId ? 'Sessão atualizada' : 'Sessão adicionada ao plano'); render();
    }
  });
}

function formTournament(existing) {
  const t = existing || { name: '', location: '', level: 'BT200', startDate: todayISO(), endDate: addDays(todayISO(), 2), isMainTarget: false, athletes: [] };
  const athChecks = db.list('athletes').map(a => `<label style="display:flex;align-items:center;gap:8px;font-size:13.5px;color:#C7CFDA;padding:4px 0;"><input type="checkbox" name="ath_${a.id}" ${t.athletes.includes(a.id) ? 'checked' : ''} style="accent-color:#FF6A3D;">${esc(a.name)}</label>`).join('');
  openModal(existing ? 'Editar torneio' : 'Novo torneio', [
    field('Nome', input('name', { value: t.name, placeholder: 'ex: Itália Open' })),
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">`,
    field('Local', input('location', { value: t.location, placeholder: 'cidade, país' })),
    field('Nível', select('level', ['BT100', 'BT200', 'BT400', 'BT1000'], t.level)),
    field('Início', input('startDate', { type: 'date', value: t.startDate })),
    field('Fim', input('endDate', { type: 'date', value: t.endDate })),
    `</div>`,
    field('Atletas participantes', `<div style="max-height:120px;overflow-y:auto;background:#14181F;border-radius:10px;padding:8px 12px;">${athChecks}</div>`),
    `<label style="display:flex;align-items:center;gap:8px;font-size:13.5px;color:#C7CFDA;margin-top:10px;"><input type="checkbox" name="isMainTarget" ${t.isMainTarget ? 'checked' : ''} style="accent-color:#FF6A3D;">Torneio alvo ★</label>`,
    existing ? `<button type="button" class="tap btn-dark" data-action="tournament-delete" data-arg="${existing.id}" style="margin-top:14px;color:#FF5D5D;">Remover torneio</button>` : '',
  ].join(''), {
    onSubmit(d, form) {
      if (d.endDate < d.startDate) return toast('Fim antes do início', 'err');
      const athletes = db.list('athletes').filter(a => form.querySelector(`[name="ath_${a.id}"]`).checked).map(a => a.id);
      if (!athletes.length) return toast('Selecione ao menos um atleta (canônico: torneio é por atleta).', 'err');
      const patch = { name: d.name, location: d.location, level: d.level, startDate: d.startDate, endDate: d.endDate, isMainTarget: !!d.isMainTarget, athletes };
      if (existing) db.update('tournaments', existing.id, patch); else db.insert('tournaments', patch);
      closeModal(); toast(existing ? 'Torneio atualizado' : 'Torneio cadastrado'); render();
    }
  });
}

// anamnese preenchida pelo próprio atleta — alimenta o Copiloto/microciclo
// (disponibilidade, acesso a academia/areia, experiência, tolerância a
// pliometria, objetivo). Campos opcionais: motor usa dose conservadora
// quando faltar dado (mesma regra do Copiloto de sessão única).
function formAnamnese(a) {
  openModal('Meus dados de treino', [
    field('Quantos treinos físicos você consegue fazer por semana?', input('disponibilidadeSemanal', { type: 'number', value: a.disponibilidadeSemanal ?? '', min: 0, max: 7, required: false })),
    `<label style="display:flex;align-items:center;gap:8px;font-size:13.5px;color:#C7CFDA;margin:12px 0 8px;"><input type="checkbox" name="acessoAcademia" ${a.acessoAcademia ? 'checked' : ''} style="accent-color:#FF6A3D;">Tenho acesso a academia</label>`,
    `<label style="display:flex;align-items:center;gap:8px;font-size:13.5px;color:#C7CFDA;margin-bottom:16px;"><input type="checkbox" name="acessoAreia" ${a.acessoAreia ? 'checked' : ''} style="accent-color:#FF6A3D;">Tenho acesso a areia/quadra pra treino físico</label>`,
    field('Experiência com treino de força', select('experienciaForca', [['', 'Não informado'], ['nenhuma', 'Nenhuma'], ['baixa', 'Baixa'], ['media', 'Média'], ['alta', 'Alta']], a.experienciaForca || '')),
    field('Tolerância a treino pliométrico (saltos)', select('toleranciaPlio', [['', 'Não informado'], ['nunca', 'Nunca treinei'], ['basica', 'Básica'], ['avancada', 'Avançada']], a.toleranciaPlio || '')),
    field('Seu objetivo principal agora', textarea('objetivo', { value: a.objetivo || '', placeholder: 'ex: melhorar aceleração pra defender bola alta' })),
  ].join(''), {
    onSubmit: async (d) => {
      await saveAnamnese(a.id, {
        disponibilidadeSemanal: d.disponibilidadeSemanal ? +d.disponibilidadeSemanal : null,
        acessoAcademia: !!d.acessoAcademia, acessoAreia: !!d.acessoAreia,
        experienciaForca: d.experienciaForca || '', toleranciaPlio: d.toleranciaPlio || '', objetivo: d.objetivo || '',
      });
      closeModal(); toast('Dados de treino atualizados'); render();
    }
  });
}

function formTravel(existing) {
  const tv = existing || { tournamentId: (nextTournament(null) || {}).id || '', origin: '', destination: '', departureDate: todayISO(), arrivalDate: addDays(todayISO(), 1), hotel: '', notes: '' };
  openModal(existing ? 'Editar viagem' : 'Nova viagem', [
    field('Torneio', select('tournamentId', db.list('tournaments').map(t => [t.id, t.name]), tv.tournamentId)),
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">`,
    field('Origem', input('origin', { value: tv.origin, placeholder: 'GRU' })),
    field('Destino', input('destination', { value: tv.destination, placeholder: 'FCO' })),
    field('Data ida', input('departureDate', { type: 'date', value: tv.departureDate })),
    field('Data chegada', input('arrivalDate', { type: 'date', value: tv.arrivalDate })),
    `</div>`,
    field('Hotel', input('hotel', { value: tv.hotel, required: false })),
    field('Observações', textarea('notes', { value: tv.notes })),
    existing ? `<button type="button" class="tap btn-dark" data-action="travel-delete" data-arg="${existing.id}" style="margin-top:14px;color:#FF5D5D;">Remover viagem</button>` : '',
  ].join(''), {
    onSubmit(d) {
      if (d.arrivalDate < d.departureDate) return toast('Chegada antes da ida', 'err');
      if (existing) db.update('travels', existing.id, d); else db.insert('travels', d);
      closeModal(); toast(existing ? 'Viagem atualizada' : 'Viagem cadastrada'); render();
    }
  });
}

function formReport() {
  openModal('Novo relatório', [
    field('Atleta', select('athleteId', [['', 'Equipe toda'], ...db.list('athletes').map(a => [a.id, a.name])], '')),
    field('Tipo', select('type', [['individual', 'Individual'], ['equipe', 'Equipe'], ['mensal', 'Mensal']], 'individual')),
    field('Período', select('period', [['semana', 'Semana atual'], ['mes', 'Últimos 30 dias']], 'semana')),
    field('Observações do treinador', textarea('notes', { placeholder: 'opcional' })),
  ].join(''), {
    submitLabel: 'Gerar relatório',
    onSubmit(d) {
      const a = d.athleteId ? db.get('athletes', d.athleteId) : null;
      const mon = mondayOf(todayISO());
      let content;
      if (a) {
        const c = latestCheckin(a.id);
        const wk = weekLoad(a.id, mon);
        const done = db.list('sessions', s => s.athleteId === a.id && s.status === 'COMPLETED' && s.date >= mon).length;
        const nt = nextTournament(a.id);
        content = `${a.name} · ${d.period === 'semana' ? 'semana atual' : 'últimos 30 dias'}. Prontidão ${c ? c.readinessScore : '—'}. Carga semanal ${wk} UA. ${done} sessão(ões) concluída(s). ${c && c.painScore > 0 ? `Alerta de dor: ${c.painLocation} ${c.painScore}/10. ` : 'Sem alertas de dor. '}${nt ? `Próximo torneio: ${nt.name} em ${diffDays(nt.startDate, todayISO())} dias.` : ''} ${d.notes || ''}`.trim();
      } else {
        const team = teamReadiness();
        const total = db.list('athletes').reduce((s, x) => s + weekLoad(x.id, mon), 0);
        content = `Equipe Brasil · ${d.period === 'semana' ? 'semana atual' : 'últimos 30 dias'}. Prontidão média ${team}. Carga total ${total} UA. ${d.notes || ''}`.trim();
      }
      const title = a ? `Relatório individual · ${a.name.split(' ')[0]} ${a.name.split(' ')[1] ? a.name.split(' ')[1][0] + '.' : ''}` : 'Relatório da equipe';
      const type = d.type === 'mensal' ? 'mensal' : (a ? 'individual' : 'equipe');
      db.insert('reports', { athleteId: d.athleteId || null, title, type, createdAt: Date.now(), content });
      closeModal(); toast('Relatório gerado'); render();
    }
  });
}

// ── ações ────────────────────────────────────────────────────────────────────
const actions = {
  // navegação
  go: (el) => { if (el.dataset.arg) state.ctx.athleteId = el.dataset.arg; go(el.dataset.screen); },
  tab: (el) => tab(el.dataset.screen),
  back: () => back(),
  future: (el) => toast(`${el.dataset.arg || 'Função'}: integração futura.`, 'warn'),
  forgot: () => toast('Recuperação de senha será integrada. Use a senha 123456.', 'warn'),
  'modal-close': () => closeModal(),

  // login (Supabase Auth real — async)
  'login-role': (el) => { state.ctx.loginRole = el.dataset.arg; render(); },
  'login-enter': async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value || '';
    const papel = (state.ctx.loginRole || 'TRAINER') === 'TRAINER' ? 'treinador' : 'atleta';
    toast('Entrando…');
    let u;
    try { u = await auth.login(email, pass, papel); }
    catch (err) { return toast(`Login falhou: ${err.message}`, 'err'); }
    await syncRemote(); // hidrata o cache das tabelas bt_* antes de navegar
    state.ctx = {};
    toast(`Bem-vindo, ${u.name.split(' ')[0]}!`);
    tab(u.role === 'TRAINER' ? 'coachDash' : 'athleteHome');
  },
  logout: async () => {
    if (!(await confirmDialog('Sair da conta?', { okLabel: 'Sair' }))) return;
    await auth.logout(); state.ctx = {}; tab('login'); toast('Sessão encerrada');
  },

  // autocadastro de atleta (Fase 3/Player) — cria conta via Edge Function
  // (signup-atleta, privilégio elevado só no servidor) e loga em seguida.
  'signup-consent-toggle': () => { state.ctx.signupConsent = !state.ctx.signupConsent; render(); },
  'signup-submit': async () => {
    const nome = document.getElementById('signup-nome').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const senha = document.getElementById('signup-senha').value || '';
    const slug = document.getElementById('signup-slug').value.trim().toLowerCase();
    const coachEmail = document.getElementById('signup-coach').value.trim();
    state.ctx.signupNome = nome; state.ctx.signupEmail = email;
    state.ctx.signupSlug = slug; state.ctx.signupCoach = coachEmail;
    if (!state.ctx.signupConsent) { state.ctx.signupError = 'É preciso aceitar o termo de consentimento para continuar.'; return render(); }
    if (!nome || !email || senha.length < 6 || !slug || !coachEmail) {
      state.ctx.signupError = 'Preencha todos os campos (senha com pelo menos 6 caracteres).'; return render();
    }
    state.ctx.signupError = ''; toast('Criando sua conta…');
    try {
      await invokePublicFunction('signup-atleta', { nome, email, senha, atletaSlug: slug, coachEmail, consentAceito: true });
    } catch (err) {
      state.ctx.signupError = err.message; return render();
    }
    let u;
    try { u = await auth.login(email, senha, 'atleta'); }
    catch (err) { state.ctx.signupError = `Conta criada, mas o login automático falhou: ${err.message}. Tente entrar pela tela de login.`; return render(); }
    await syncRemote();
    state.ctx = {};
    toast(`Bem-vindo, ${u.name.split(' ')[0]}!`);
    tab('athleteHome');
  },

  // atletas
  'open-athlete': (el) => { state.ctx.athleteId = el.dataset.arg; go('coachProfile'); },
  'athletes-filter': (el) => {
    state.ctx.athleteFilter = el.dataset.arg;
    if (cur() !== 'coachAthletes') tab('coachAthletes'); else render();
  },

  // avaliação
  'assessment-new': () => formAssessment(),
  'athlete-anamnese-edit': () => {
    const a = db.get('athletes', auth.current().athleteId) || db.list('athletes')[0];
    if (a) formAnamnese(a);
  },

  // plano / sessões
  'plan-week': (el) => { state.ctx.planWeek = addDays(state.ctx.planWeek || mondayOf(todayISO()), 7 * +el.dataset.arg); render(); },
  'session-new': (el) => formSession(null, el.dataset.arg),
  'session-edit': (el) => {
    const s = db.get('sessions', el.dataset.arg);
    if (s && s.prescrita) return toast('Sessão prescrita pelo motor — edição só pelo lab.', 'warn');
    if (s) formSession(s);
  },
  'session-ex-add': () => {
    const form = document.getElementById('modal-form');
    const draft = captureSessionDraft(form);
    draft.exercises.push({ name: EXERCISE_LIBRARY[0].nome, sets: 3, reps: '10' });
    formSession(null, null, draft);
  },
  'session-ex-remove': (el) => {
    const form = document.getElementById('modal-form');
    const draft = captureSessionDraft(form);
    if (draft.exercises.length <= 1) return toast('A sessão precisa de pelo menos 1 exercício', 'warn');
    draft.exercises.splice(+el.dataset.arg, 1);
    formSession(null, null, draft);
  },
  'session-delete': async (el) => {
    closeModal();
    if (!(await confirmDialog('Remover esta sessão do plano?', { okLabel: 'Remover' }))) return;
    db.remove('sessions', el.dataset.arg); toast('Sessão removida'); render();
  },

  // decisão da semana — 6 valores oficiais, gravada em bt_decisoes_semana
  'decision-apply': async (el) => {
    const a = db.get('athletes', state.ctx.athleteId) || db.list('athletes')[0];
    const dec = el.dataset.arg;
    const factor = { PROGREDIR: 1.10, REDUZIR: 0.80, DESCARREGAR: 0.60, MANTER: 1, REAVALIAR: 1, ENCAMINHAR: 1 }[dec] || 1;
    if (factor !== 1) {
      if (!(await confirmDialog(`Aplicar ${dec} (${factor > 1 ? '+' : '−'}${Math.round(Math.abs(factor - 1) * 100)}%) nas sessões planejadas da semana de ${a.name.split(' ')[0]}?`, { okLabel: 'Aplicar', danger: false }))) return;
      const mon = mondayOf(todayISO());
      const planned = db.list('sessions', s => s.athleteId === a.id && s.status === 'PLANNED' && s.date >= mon && s.date <= addDays(mon, 6));
      planned.forEach(s => db.update('sessions', s.id, { plannedLoad: Math.round(s.plannedLoad * factor) }));
      toast(planned.length ? `${dec} aplicado a ${planned.length} sessão(ões)` : `${dec} registrado — sem sessões planejadas nesta semana`);
    } else toast(`Decisão ${dec} registrada`);
    saveDecision(a.id, { sugerida: dec, final: dec, note: `Aplicado manualmente em ${fmtShort(todayISO())}.` });
    tab('coachPlan');
  },
  'decision-adjust': () => {
    const a = db.get('athletes', state.ctx.athleteId) || db.list('athletes')[0];
    const dec = (db.all().decisions || {})[a.id] || {};
    openModal(`Ajustar decisão · ${a.name.split(' ')[0]}`, [
      field('Decisão', select('decision', ['PROGREDIR', 'MANTER', 'REDUZIR', 'DESCARREGAR', 'REAVALIAR', 'ENCAMINHAR'], dec.decision || 'MANTER')),
      field('Justificativa', textarea('note', { value: dec.note || '', placeholder: 'critério do treinador' })),
    ].join(''), {
      onSubmit(d) {
        saveDecision(a.id, { final: d.decision, note: d.note });
        closeModal(); toast('Decisão registrada'); render();
      }
    });
  },

  // radar de evidências
  'radar-open': (el) => { state.ctx.athleteId = el.dataset.arg; go('coachRadarDetail'); },
  'radar-confirm': async (el) => {
    const a = db.get('athletes', state.ctx.athleteId) || db.list('athletes')[0];
    const dec = el.dataset.arg;
    const confidence = el.dataset.confidence || 'BAIXA';
    const factor = { PROGREDIR: 1.10, REDUZIR: 0.80, DESCARREGAR: 0.60, MANTER: 1, REAVALIAR: 1, ENCAMINHAR: 1 }[dec] || 1;
    if (factor !== 1) {
      const mon = mondayOf(todayISO());
      const planned = db.list('sessions', s => s.athleteId === a.id && s.status === 'PLANNED' && s.date >= mon && s.date <= addDays(mon, 6));
      planned.forEach(s => db.update('sessions', s.id, { plannedLoad: Math.round(s.plannedLoad * factor) }));
    }
    const analysis = C.radarAnalysis(a);
    saveDecision(a.id, { sugerida: dec, final: dec, note: `Confirmado via Radar em ${fmtShort(todayISO())}.`, confianca: confidence, analysis });
    toast(`Decisão ${dec} confirmada ✓`); render();
  },
  'radar-alter': () => {
    const a = db.get('athletes', state.ctx.athleteId) || db.list('athletes')[0];
    const dec = (db.all().decisions || {})[a.id] || {};
    openModal(`Alterar decisão · ${a.name.split(' ')[0]}`, [
      field('Decisão', select('decision', ['PROGREDIR', 'MANTER', 'REDUZIR', 'DESCARREGAR', 'REAVALIAR', 'ENCAMINHAR'], dec.decision || 'MANTER')),
      field('Motivo (obrigatório)', textarea('note', { value: '', placeholder: 'critério do treinador para alterar a sugestão' })),
    ].join(''), {
      onSubmit(d) {
        if (!d.note || !d.note.trim()) return toast('Motivo obrigatório ao alterar a sugestão.', 'err');
        saveDecision(a.id, { sugerida: C.radarAnalysis(a).sugAction, final: d.decision, note: d.note.trim(), analysis: C.radarAnalysis(a) });
        closeModal(); toast('Decisão alterada e registrada'); render();
      }
    });
  },

  // relatórios
  'report-new': () => formReport(),
  'report-view': (el) => {
    const rp = db.get('reports', el.dataset.arg); if (!rp) return;
    openModal(rp.title, `<div style="font-size:14px;color:#C7CFDA;line-height:1.6;">${esc(rp.content)}</div>
      <button type="button" class="tap btn-dark" data-action="report-delete" data-arg="${rp.id}" style="margin-top:18px;color:#FF5D5D;">Excluir relatório</button>`);
  },
  'report-delete': async (el) => {
    closeModal();
    if (!(await confirmDialog('Excluir este relatório?', { okLabel: 'Excluir' }))) return;
    db.remove('reports', el.dataset.arg); toast('Relatório excluído'); render();
  },

  // torneios e viagens
  'tournament-new': () => formTournament(),
  'tournament-edit': (el) => { const t = db.get('tournaments', el.dataset.arg); if (t) formTournament(t); },
  'tournament-delete': async (el) => {
    closeModal();
    if (!(await confirmDialog('Remover este torneio?', { okLabel: 'Remover' }))) return;
    db.remove('tournaments', el.dataset.arg); toast('Torneio removido'); render();
  },
  'travel-new': () => formTravel(),
  'travel-edit': (el) => { const t = db.get('travels', el.dataset.arg); if (t) formTravel(t); },
  'travel-delete': async (el) => {
    closeModal();
    if (!(await confirmDialog('Remover esta viagem?', { okLabel: 'Remover' }))) return;
    db.remove('travels', el.dataset.arg); toast('Viagem removida'); render();
  },

  // notificações
  'notif-read': (el) => { db.update('notifications', el.dataset.arg, { read: true }); render(); },
  'settings-push': () => { const s = db.all().settings; s.pushEnabled = !s.pushEnabled; db.save(); toast(s.pushEnabled ? 'Push ativado' : 'Push desativado'); render(); },

  // check-in — wellness canônico (bt_monitoramento_diario) + dor (bt_dor_registros);
  // prontidão vem APENAS da view bt_prontidao_v1
  'checkin-set': (el) => { state.ctx.checkin[el.dataset.key] = +el.dataset.arg; render(); },
  'checkin-save': async () => {
    const u = auth.current();
    const a = db.get('athletes', u.athleteId) || db.list('athletes')[0];
    if (!a) return toast('Seu perfil ainda não está vinculado a um atleta. Fale com o treinador.', 'err');
    const ck = state.ctx.checkin;
    ck.painLocation = (document.getElementById('ck-painloc') || {}).value ?? ck.painLocation;
    ck.painScore = Math.max(0, Math.min(10, +((document.getElementById('ck-painscore') || {}).value ?? ck.painScore) || 0));
    ck.alteraMovimento = !!(document.getElementById('ck-altera') || {}).checked;
    ck.emImpacto = !!(document.getElementById('ck-impacto') || {}).checked;
    toast('Enviando check-in…');
    let res;
    try { res = await saveCheckin(a.id, ck); }
    catch (err) { return toast(`Falha ao salvar check-in: ${err.message}`, 'err'); }
    // notificação local para o treinador (LEGADO: só aparece neste dispositivo)
    if ((res.banda && res.banda !== 'VERDE') || ck.painScore >= 4) {
      db.insert('notifications', { userId: a.trainerId, title: `${a.name.split(' ')[0]} reportou ${res.banda !== 'VERDE' ? 'prontidão baixa' : 'dor'}`, description: `Prontidão ${res.prontidao ?? '—'}/25 (${res.banda || '—'})${ck.painScore ? ` · dor ${ck.painLocation || ''} ${ck.painScore}/10` : ''}`, type: 'alert', read: false, createdAt: Date.now() });
    }
    delete state.ctx.checkin;
    toast(`Check-in salvo · Recovery ${res.readiness}`);
    tab('athleteHome');
  },

  // treino
  'workout-start': (el) => {
    const s = db.get('sessions', el.dataset.arg) || A.todaySession((auth.current() || {}).athleteId);
    if (!s) return toast('Sem treino para hoje', 'warn');
    if (s.status === 'PLANNED') { db.update('sessions', s.id, { status: 'IN_PROGRESS' }); toast('Treino iniciado 💪'); }
    state.ctx.sessionId = s.id;
    if (cur() !== 'athleteWorkout') tab('athleteWorkout'); else render();
  },
  'exercise-toggle': (el) => {
    const s = db.get('sessions', state.ctx.sessionId); if (!s || s.status === 'COMPLETED') return;
    const e = s.exercises.find(x => x.id === el.dataset.arg); if (!e) return;
    e.status = e.status === 'DONE' ? 'PENDING' : 'DONE';
    db.update('sessions', s.id, { status: s.status === 'PLANNED' ? 'IN_PROGRESS' : s.status, exercises: s.exercises });
    render();
  },
  'workout-continue': () => {
    const s = db.get('sessions', state.ctx.sessionId); if (!s) return;
    const nxt = s.exercises.sort((a, b) => a.order - b.order).find(e => e.status !== 'DONE');
    if (nxt) { nxt.status = 'DONE'; db.update('sessions', s.id, { exercises: s.exercises }); toast(`${nxt.name} concluído ✓`); render(); }
  },
  'workout-finish': (el) => {
    const s = db.get('sessions', el.dataset.arg || state.ctx.sessionId); if (!s) return;
    openModal('Finalizar treino', [
      `<div style="font-size:14px;color:#C7CFDA;margin-bottom:14px;">Como foi o esforço da sessão inteira?</div>`,
      field('RPE final (1–10)', input('rpe', { type: 'number', min: 1, max: 10, value: s.targetRpe === '—' ? 7 : s.targetRpe })),
    ].join(''), {
      submitLabel: 'Finalizar',
      onSubmit(d) {
        const rpe = Math.max(1, Math.min(10, +d.rpe));
        s.exercises.forEach(e => e.status = 'DONE');
        db.update('sessions', s.id, { status: 'COMPLETED', rpeFinal: rpe, exercises: s.exercises });
        const a = db.get('athletes', s.athleteId);
        db.insert('notifications', { userId: a.trainerId, title: `${a.name.split(' ')[0]} completou ${s.title}`, description: `RPE ${rpe} · ${s.durationMinutes} min · ${Math.round(s.durationMinutes * rpe)} UA`, type: 'success', read: false, createdAt: Date.now() });
        closeModal(); toast(`Treino finalizado · ${Math.round(s.durationMinutes * rpe)} UA`); render();
      }
    });
  },

  // copiloto de sessão
  'copiloto-generate': async () => {
    const contextEl = document.getElementById('copiloto-context');
    const contextText = (contextEl && contextEl.value) || state.ctx.copilotoContext || '';
    state.ctx.copilotoContext = contextText;
    const a = db.get('athletes', state.ctx.copilotoAthleteId || state.ctx.athleteId) || db.list('athletes')[0];
    if (!a) return toast('Nenhum atleta selecionado', 'err');
    const c = latestCheckin(a.id);
    const nt = nextTournament(a.id);
    const assess = db.list('assessments', x => x.athleteId === a.id).sort((x, y) => y.date.localeCompare(x.date))[0] || null;
    const recentSessions = db.list('sessions', s => s.athleteId === a.id).sort((x, y) => y.date.localeCompare(x.date));
    const mon = mondayOf(todayISO());
    const wkCurrent = weekLoad(a.id, mon);
    const wkPrev = weekLoad(a.id, addDays(mon, -7));
    const analysis = analyzeAthleteWeek({
      athlete: a, today: todayISO(), checkins: db.list('checkins'), sessions: db.list('sessions'),
      assessments: db.list('assessments'), tournaments: db.list('tournaments'), travels: db.list('travels'),
    });
    if (analysis.decision === 'ENCAMINHAR') {
      return toast('Prescrição bloqueada: os dados atuais pedem encaminhamento profissional antes de montar o treino.', 'err');
    }
    const userPrompt = buildCopilotoPrompt(a, c, nt, assess, recentSessions, wkCurrent, wkPrev, contextText, analysis);
    state.ctx.copilotoLoading = true;
    state.ctx.copilotoResult = '';
    state.ctx.copilotoApproved = false;
    render();
    try {
      const result = await callCopiloto(userPrompt);
      state.ctx.copilotoResult = result;
      state.ctx.copilotoLoading = false;
      render();
    } catch (err) {
      state.ctx.copilotoLoading = false;
      toast(`Erro na API: ${err.message}`, 'err');
      render();
    }
  },
  'copiloto-approve': () => {
    const result = state.ctx.copilotoResult;
    if (!result) return;
    const a = db.get('athletes', state.ctx.copilotoAthleteId || state.ctx.athleteId) || db.list('athletes')[0];
    if (!a) return;
    const validation = validateCopilotoResult(result, { checkin: latestCheckin(a.id), contextText: state.ctx.copilotoContext || '' });
    if (!validation.ok) return toast(`Sessão bloqueada: ${validation.error}`, 'err');
    const titleMatch = result.match(/^# (.+)$/m);
    const title = titleMatch ? titleMatch[1].replace(/\*\*/g, '').trim() : 'Sessão prescrita por IA';
    const durMatch = result.match(/Duração estimada:\*\*?\s*(\d+)/i);
    const duration = validation.duration;
    const isSand = validation.code.startsWith('B');
    // baixa fadiga por definição (motor-prescricao.md): A5 descarga, A6A controle
    // de tronco, B7 pós-torneio — checar pelo código, não pelo texto do título.
    const isRegen = ['A5', 'A6A', 'B7'].includes(validation.code);
    const type = isRegen ? 'Regenerativo' : isSand ? 'Quadra' : /Potência/i.test(title) ? 'Potência' : 'Força';
    db.insert('sessions', {
      athleteId: a.id, date: todayISO(), title, type,
      location: isSand ? 'SAND' : 'GYM',
      durationMinutes: duration, targetRpe: isRegen ? 5 : 7,
      plannedLoad: Math.round(duration * (isRegen ? 5 : 7)),
      notes: result, prescrita: true, aiAssisted: true, sessionCode: validation.code,
      exercises: validation.exercises, status: 'PLANNED',
    });
    state.ctx.copilotoApproved = true;
    toast('Sessão aprovada e salva no plano ✓');
    render();
  },
  'copiloto-reject': () => {
    state.ctx.copilotoResult = '';
    state.ctx.copilotoApproved = false;
    toast('Sessão rejeitada — gere uma nova', 'warn');
    render();
  },
  'copiloto-adjust': () => {
    const result = state.ctx.copilotoResult || '';
    if (!result) return;
    openModal('Ajustar sugestão da IA', [
      `<div style="font-size:12.5px;color:#8A94A3;line-height:1.5;margin-bottom:12px;">O professor continua responsável pela dose final. A sessão será validada novamente antes de salvar.</div>`,
      field('Sessão', textarea('result', { value: result, rows: 18 })),
    ].join(''), {
      submitLabel: 'Aplicar ajustes',
      onSubmit(d) {
        state.ctx.copilotoResult = String(d.result || '').trim();
        state.ctx.copilotoApproved = false;
        closeModal(); toast('Ajustes aplicados — revise e aprove'); render();
      },
    });
  },

  // microciclo (semana inteira, sequência de chamadas ao mesmo Copiloto de sessão)
  'microciclo-generate': async () => {
    const a = db.get('athletes', state.ctx.copilotoAthleteId || state.ctx.athleteId) || db.list('athletes')[0];
    if (!a) return toast('Nenhum atleta selecionado', 'err');
    const c = latestCheckin(a.id);
    const analysis = analyzeAthleteWeek({
      athlete: a, today: todayISO(), checkins: db.list('checkins'), sessions: db.list('sessions'),
      assessments: db.list('assessments'), tournaments: db.list('tournaments'), travels: db.list('travels'),
    });
    if (analysis.decision === 'ENCAMINHAR') {
      return toast('Bloqueado: os dados atuais pedem encaminhamento profissional antes de montar o microciclo.', 'err');
    }
    const n = a.disponibilidadeSemanal || 3;
    if (!a.disponibilidadeSemanal) toast('Atleta não informou disponibilidade semanal no perfil — usando 3x/semana como padrão.', 'warn');
    const monday = mondayOf(todayISO());
    const days = pickMicrocicloDays(a.id, monday, n);
    if (!days.length) return toast('Nenhum dia livre esta semana — torneio, viagem ou sessões já ocupam o plano inteiro.', 'err');
    const weekTravels = db.list('travels', t => t.athleteId === a.id);
    const weekTournaments = db.list('tournaments', t => (t.athletes || []).includes(a.id));
    state.ctx.microcicloAthleteId = a.id;
    state.ctx.microcicloLoading = true;
    state.ctx.microcicloResults = [];
    state.ctx.microcicloTotalDays = days.length;
    go('coachMicrociclo');
    const results = [];
    for (let i = 0; i < days.length; i++) {
      // espaça as chamadas — a Groq rate-limita pedidos em sequência rápida
      // (o servidor já tenta de novo sozinho, isso é só pra evitar bater no
      // limite logo de cara quando o microciclo tem vários dias).
      if (i > 0) await new Promise(r => setTimeout(r, 3000));
      const date = days[i];
      const priorCodes = results.map(r => r.validation && r.validation.code).filter(Boolean);
      const prompt = buildMicrocicloPrompt(a, c, date, i + 1, days.length, priorCodes, analysis, weekTravels, weekTournaments);
      try {
        const text = await callCopiloto(prompt);
        const validation = validateCopilotoResult(text, { checkin: c, contextText: '' });
        results.push({ date, result: text, validation, approved: false });
      } catch (err) {
        results.push({ date, result: '', validation: { ok: false, error: err.message }, approved: false });
      }
      state.ctx.microcicloResults = [...results];
      render();
    }
    state.ctx.microcicloLoading = false;
    render();
  },
  'microciclo-day-approve': (el) => {
    const i = +el.dataset.arg;
    const day = (state.ctx.microcicloResults || [])[i];
    const a = db.get('athletes', state.ctx.microcicloAthleteId);
    if (!day || !a || !day.validation.ok || day.approved) return;
    const titleMatch = day.result.match(/^# (.+)$/m);
    const title = titleMatch ? titleMatch[1].replace(/\*\*/g, '').trim() : 'Sessão prescrita por IA';
    const isSand = day.validation.code.startsWith('B');
    const isRegen = ['A5', 'A6A', 'B7'].includes(day.validation.code);
    const type = isRegen ? 'Regenerativo' : isSand ? 'Quadra' : /Potência/i.test(title) ? 'Potência' : 'Força';
    db.insert('sessions', {
      athleteId: a.id, date: day.date, title, type,
      location: isSand ? 'SAND' : 'GYM',
      durationMinutes: day.validation.duration, targetRpe: isRegen ? 5 : 7,
      plannedLoad: Math.round(day.validation.duration * (isRegen ? 5 : 7)),
      notes: day.result, prescrita: true, aiAssisted: true, sessionCode: day.validation.code,
      exercises: day.validation.exercises, status: 'PLANNED',
    });
    day.approved = true;
    toast(`Sessão de ${day.date} aprovada e salva ✓`);
    render();
  },
  'microciclo-day-reject': (el) => {
    const i = +el.dataset.arg;
    const results = state.ctx.microcicloResults || [];
    if (results[i]) results.splice(i, 1);
    render();
  },
  'microciclo-approve-all': () => {
    const results = state.ctx.microcicloResults || [];
    let count = 0;
    results.forEach((day, i) => {
      if (day.validation.ok && !day.approved) { actions['microciclo-day-approve']({ dataset: { arg: String(i) } }); count++; }
    });
    if (count) toast(`${count} sessão(ões) aprovada(s) e salva(s) no plano ✓`);
  },

  // mensagens
  'msg-send': () => {
    const inp = document.getElementById('msg-input');
    const text = (inp.value || '').trim();
    if (!text) return;
    const u = auth.current();
    const other = u.role === 'TRAINER' ? db.list('users', x => x.role === 'ATHLETE')[0] : db.list('users', x => x.role === 'TRAINER')[0];
    db.insert('messages', { senderId: u.id, receiverId: other.id, content: text, createdAt: Date.now(), read: false });
    render();
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = actions[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el); }
});

history.replaceState({ i: state.stack.length }, '');
render();

// Boot: renderiza o snapshot local primeiro, hidrata das tabelas bt_* e re-renderiza.
// Se a sessão Supabase expirou/é inválida, volta para o login.
window.addEventListener('btp-sync-error', () => toast('Nuvem indisponível — alteração pode não ter sido salva', 'warn'));
syncRemote().then((mudou) => {
  if (!auth.current() && cur() !== 'login') { state.stack = ['login']; render(); }
  else if (mudou || !ready()) render();
});
