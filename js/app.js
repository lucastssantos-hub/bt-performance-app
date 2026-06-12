// app.js — router de pilha + despachante de ações + formulários (modais)
import { db, auth, syncRemote, ready, saveCheckin, saveDecision, uid, todayISO, addDays, mondayOf, latestCheckin, weekLoad, recoveryOf, athleteStatus, nextTournament, diffDays, sessionLoad, teamReadiness } from './db.js';
import { toast, openModal, closeModal, confirmDialog, field, input, select, textarea, esc, fmtShort } from './ui.js';
import * as C from './screens-coach.js';
import * as A from './screens-athlete.js';

const NAV_KEY = 'btperf_nav_v1';
const screens = {
  login: A.login,
  coachDash: C.coachDash, coachAthletes: C.coachAthletes, coachProfile: C.coachProfile,
  coachAssessment: C.coachAssessment, coachHistory: C.coachHistory, coachPlan: C.coachPlan,
  coachDecision: C.coachDecision, coachRadar: C.coachRadar, coachRadarDetail: C.coachRadarDetail,
  coachReports: C.coachReports, coachCalendar: C.coachCalendar,
  coachTravels: C.coachTravels, coachNotifications: C.coachNotifications, coachSettings: C.coachSettings,
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

function formSession(existing, presetDate) {
  const a = db.get('athletes', state.ctx.athleteId) || db.list('athletes')[0];
  const s = existing || { athleteId: a.id, date: presetDate || todayISO(), title: '', type: 'Força', location: 'GYM', durationMinutes: 60, targetRpe: 7, plannedLoad: 0, notes: '' };
  openModal(existing ? 'Editar sessão' : 'Nova sessão', [
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
    field('Exercícios (um por linha: nome · séries×reps)', textarea('exercises', { value: (s.exercises || []).map(e => `${e.name} · ${e.sets}×${e.reps}`).join('\n'), placeholder: 'Agachamento · 4×5\nTerra romeno · 3×8' })),
    existing ? `<button type="button" class="tap btn-dark" data-action="session-delete" data-arg="${existing.id}" style="margin-top:14px;color:#FF5D5D;">Remover sessão</button>` : '',
  ].join(''), {
    onSubmit(d) {
      const exercises = (d.exercises || '').split('\n').map(l => l.trim()).filter(Boolean).map((l, i) => {
        const [name, sr] = l.split('·').map(x => x.trim());
        const m = (sr || '').match(/(\d+)\s*[x×]\s*(.+)/i);
        return { id: uid(), name: name || l, sets: m ? +m[1] : 3, reps: m ? m[2] : '10', intensity: '', rest: '', order: i, status: 'PENDING' };
      });
      const patch = { athleteId: d.athleteId, date: d.date, title: d.title, type: d.type, location: d.location, durationMinutes: +d.durationMinutes, targetRpe: +d.targetRpe, plannedLoad: +d.plannedLoad || Math.round(+d.durationMinutes * +d.targetRpe), notes: d.notes || '' };
      if (exercises.length) patch.exercises = exercises;
      if (existing) db.update('sessions', existing.id, patch);
      else db.insert('sessions', { ...patch, status: 'PLANNED', exercises });
      closeModal(); toast(existing ? 'Sessão atualizada' : 'Sessão adicionada ao plano'); render();
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

  // atletas
  'open-athlete': (el) => { state.ctx.athleteId = el.dataset.arg; go('coachProfile'); },
  'athletes-filter': (el) => {
    state.ctx.athleteFilter = el.dataset.arg;
    if (cur() !== 'coachAthletes') tab('coachAthletes'); else render();
  },

  // avaliação
  'assessment-new': () => formAssessment(),

  // plano / sessões
  'plan-week': (el) => { state.ctx.planWeek = addDays(state.ctx.planWeek || mondayOf(todayISO()), 7 * +el.dataset.arg); render(); },
  'session-new': (el) => formSession(null, el.dataset.arg),
  'session-edit': (el) => {
    const s = db.get('sessions', el.dataset.arg);
    if (s && s.prescrita) return toast('Sessão prescrita pelo motor — edição só pelo lab.', 'warn');
    if (s) formSession(s);
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
    saveDecision(a.id, { sugerida: dec, final: dec, note: `Confirmado via Radar em ${fmtShort(todayISO())}.`, confianca: confidence });
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
        saveDecision(a.id, { final: d.decision, note: d.note.trim() });
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
