// screens-coach.js — telas do treinador, renderizadas a partir do db (visual idêntico ao protótipo)
import { db, auth, recoveryOf, athleteStatus, latestCheckin, nextTournament, weekLoad, sessionLoad, teamReadiness, STATUS_META, todayISO, addDays, diffDays, mondayOf, dayN } from './db.js';
import { esc, ring, avatar, initialsOf, fmtShort, fmtDow, fmtDayNum, fmtTimeAgo, fmtHoursMin } from './ui.js';
import { analyzeAthleteWeek } from './decision-engine.js';

const ICONS = {
  back: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F4F6F8" stroke-width="2.2"><path d="m15 18-6-6 6-6"/></svg>`,
  chev: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A6472" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>`,
  warn: (c) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2"><path d="M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>`,
  check: (c) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2"><path d="M7 13l4 4 6-10"/></svg>`,
  cal: (c) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2"><path d="M8 2v3M16 2v3M3 9h18M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/></svg>`,
  injury: (c) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2"><path d="m4.5 4.5 15 15M9 4a4 4 0 0 1 8 0c0 3-2 4-2 6m-9 4c0 3 2 5 6 5"/><path d="M12 22a4 4 0 0 1-4-4c0-3 2-4 2-6"/></svg>`,
  barbell: (c) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2"><path d="M6 7v10M18 7v10M4 12h16M9 5v14M15 5v14"/></svg>`,
  bolt: (c) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>`,
  clock: (c) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  doc: (c) => `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`,
  download: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A6472" stroke-width="2"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>`,
  plus: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4F6F8" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`,
};
export { ICONS };

export function tabbar(active, role) {
  const items = role === 'TRAINER'
    ? [['coachDash', 'Home'], ['coachAthletes', 'Atletas'], ['coachPlan', 'Plano'], ['coachReports', 'Relatórios'], ['coachSettings', 'Config']]
    : [['athleteHome', 'Home'], ['athleteWorkout', 'Treino'], ['athleteRecovery', 'Recovery'], ['athleteMessages', 'Mensagens'], ['athleteProfile', 'Perfil']];
  const icons = {
    coachDash: (c) => `<svg width="23" height="23" viewBox="0 0 24 24" fill="${c === '#FF6A3D' ? c : 'none'}" stroke="${c}" stroke-width="2"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>`,
    coachAthletes: (c) => `<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5M15 14c2.5 0 4 1.6 4 4"/></svg>`,
    coachPlan: (c) => `<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 2v5M16 2v5M3 10h18"/></svg>`,
    coachReports: (c) => `<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>`,
    coachSettings: (c) => `<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`,
    athleteHome: (c) => icons.coachDash(c),
    athleteWorkout: (c) => `<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M6 7v10M18 7v10M4 12h16M9 5v14M15 5v14"/></svg>`,
    athleteRecovery: (c) => `<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M3 12h4l2 5 4-12 2 7h6"/></svg>`,
    athleteMessages: (c) => `<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M4 5h16v11H8l-4 4z"/></svg>`,
    athleteProfile: (c) => `<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>`,
  };
  return `<div class="tabbar">${items.map(([id, label]) => {
    const c = id === active ? '#FF6A3D' : '#5A6472';
    return `<div class="tap tabitem" data-action="tab" data-screen="${id}" style="color:${c};">${icons[id](c)}<span style="font-size:10px;font-weight:${id === active ? 700 : 600};">${label}</span></div>`;
  }).join('')}</div>`;
}

export const header = (title, sub = '', right = '') => `
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
    <div class="tap backbtn" data-action="back">${ICONS.back}</div>
    <div style="flex:1;"><div style="font-family:'Space Grotesk';font-weight:700;font-size:20px;">${esc(title)}</div>${sub ? `<div style="font-size:12.5px;color:#8A94A3;">${sub}</div>` : ''}</div>${right}
  </div>`;

const statusDot = (status) => `<div style="position:absolute;bottom:-1px;right:-1px;width:14px;height:14px;border-radius:50%;background:${STATUS_META[status].color};border:2.5px solid #0D1015;"></div>`;

// ── DASHBOARD ────────────────────────────────────────────────────────────────
export function coachDash() {
  const me = auth.current();
  const athletes = db.list('athletes');
  const enriched = athletes.map(a => ({ a, st: athleteStatus(a), r: recoveryOf(a) }));
  const team = teamReadiness();
  const adjust = enriched.filter(x => x.st === 'ATTENTION').length;
  const segs = enriched.map(x => `<div style="width:22px;height:8px;border-radius:4px;background:${STATUS_META[x.st].color};"></div>`).join('');
  const groups = [
    ['ATTENTION', 'Carga/sono fora da faixa', ICONS.warn('#FFC24B'), 'rgba(255,194,75,'],
    ['READY', 'Prontidão alta', ICONS.check('#34E0A1'), 'rgba(52,224,161,'],
    ['COMPETING_SOON', '', ICONS.cal('#5B9DFF'), 'rgba(91,157,255,'],
    ['INJURED', '', ICONS.injury('#FF5D5D'), 'rgba(255,93,93,'],
  ];
  const nt = nextTournament(null);
  const unread = db.list('notifications', n => n.userId === me.id && !n.read).length;
  const dows = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const d = new Date();
  const cards = groups.map(([st, subDefault, icon, rgba]) => {
    const list = enriched.filter(x => x.st === st);
    if (!list.length) return '';
    let sub = subDefault;
    if (st === 'COMPETING_SOON' && nt) sub = `${esc(nt.name)} · em ${diffDays(nt.startDate, todayISO())} dias`;
    if (st === 'INJURED') sub = esc(list[0].a.notes || 'Em recuperação');
    if (st === 'READY') sub = `prontidão média ${Math.round(list.reduce((s, x) => s + x.r, 0) / list.length)}`;
    const avs = list.slice(0, 3).map((x, i) => `<div style="width:30px;height:30px;border-radius:50%;background:#2A323D;border:2px solid #0D1015;${i ? 'margin-left:-9px;' : ''}display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:${STATUS_META[st].color};">${initialsOf(list[i] ? list[i].a.name : '')}</div>`).join('')
      + (list.length > 3 ? `<div style="width:30px;height:30px;border-radius:50%;background:#2A323D;border:2px solid #0D1015;margin-left:-9px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;">+${list.length - 3}</div>` : '');
    const act = st === 'COMPETING_SOON' ? 'data-action="go" data-screen="coachCalendar"' : `data-action="athletes-filter" data-arg="${st}"`;
    return `<div class="tap" ${act} style="display:flex;align-items:center;gap:14px;background:#0D1015;border:1px solid ${rgba}.22);border-radius:16px;padding:14px 16px;">
      <div style="width:40px;height:40px;border-radius:12px;background:${rgba}.14);display:flex;align-items:center;justify-content:center;">${icon}</div>
      <div style="flex:1;"><div style="font-weight:700;font-size:15px;">${STATUS_META[st].label}</div><div style="font-size:12.5px;color:#8A94A3;">${sub}</div></div>
      <div style="display:flex;align-items:center;">${avs}</div></div>`;
  }).join('');
  return `<div class="pagepad">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <div><div style="font-size:13px;color:#8A94A3;">${dows[d.getDay()]}, ${fmtShort(todayISO())} · Equipe Brasil</div><div style="font-family:'Space Grotesk';font-weight:700;font-size:23px;letter-spacing:-.01em;">Bom dia, ${esc(me.name.split(' ')[0])}</div></div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="tap" data-action="go" data-screen="coachNotifications" style="position:relative;width:40px;height:40px;border-radius:12px;background:#14181F;display:flex;align-items:center;justify-content:center;"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#F4F6F8" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>${unread ? '<div style="position:absolute;top:9px;right:10px;width:7px;height:7px;border-radius:50%;background:#FF5D5D;"></div>' : ''}</div>
        <div class="tap" data-action="tab" data-screen="coachSettings">${avatar(me.avatarInitials, 44, 'linear-gradient(135deg,#FF6A3D,#FF9A3D)', '#0B0E12')}</div>
      </div></div>
    <div class="tap" data-action="tab" data-screen="coachRadar" style="background:linear-gradient(135deg,#0F1820,#0D1015);border:1px solid rgba(255,93,93,.2);border-radius:18px;padding:15px 17px;margin-bottom:10px;display:flex;align-items:center;gap:14px;">
      <div style="width:40px;height:40px;border-radius:12px;background:rgba(255,93,93,.12);display:flex;align-items:center;justify-content:center;">${ICONS.warn('#FF5D5D')}</div>
      <div style="flex:1;"><div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:#FF5D5D;margin-bottom:2px;">RADAR DE EVIDÊNCIAS</div>
        <div style="font-size:13.5px;color:#C7CFDA;">${enriched.filter(x => x.st === 'ATTENTION' || x.st === 'INJURED').length} atleta(s) merecem atenção agora</div></div>
      ${ICONS.chev}</div>
    <div class="tap" data-action="go" data-screen="coachDecision" style="background:#0D1015;border:1px solid rgba(255,255,255,.07);border-radius:20px;padding:18px;margin-bottom:16px;display:flex;align-items:center;gap:18px;">
      ${ring(team, '#FF6A3D', 74, 58, 22)}
      <div style="flex:1;"><div style="font-size:11px;font-weight:700;letter-spacing:.12em;color:#5A6472;margin-bottom:4px;">PRONTIDÃO DA EQUIPE</div>
        <div style="font-size:14px;color:#C7CFDA;line-height:1.4;">${athletes.length} atletas · <span style="color:#FFC24B;font-weight:700;">${adjust} ${adjust === 1 ? 'pede' : 'pedem'} ajuste hoje</span></div>
        <div style="display:flex;gap:5px;margin-top:10px;">${segs}</div></div>
      ${ICONS.chev}</div>
    <div class="seclabel" style="margin:6px 4px 12px;">PRECISA DE VOCÊ AGORA</div>
    <div style="display:flex;flex-direction:column;gap:11px;">${cards}</div>
  </div>${tabbar('coachDash', 'TRAINER')}`;
}

// ── ATLETAS ──────────────────────────────────────────────────────────────────
export function coachAthletes(ctx) {
  const filter = ctx.athleteFilter || 'ALL';
  const q = (ctx.athleteSearch || '').toLowerCase();
  const all = db.list('athletes').map(a => ({ a, st: athleteStatus(a), r: recoveryOf(a) }));
  const chips = [['ALL', `Todos · ${all.length}`], ['ATTENTION', 'Atenção'], ['READY', 'Prontos'], ['INJURED', 'Lesão']];
  const list = all.filter(x => (filter === 'ALL' || x.st === filter || (filter === 'READY' && x.st === 'COMPETING_SOON' && false)) && (!q || x.a.name.toLowerCase().includes(q)));
  const rows = list.map(({ a, st, r }) => `
    <div class="tap" data-action="open-athlete" data-arg="${a.id}" style="display:flex;align-items:center;gap:13px;background:#0D1015;border:1px solid rgba(255,255,255,.06);border-radius:15px;padding:13px;">
      <div style="position:relative;">${avatar(initialsOf(a.name))}${statusDot(st)}</div>
      <div style="flex:1;"><div style="font-weight:700;font-size:15.5px;">${esc(a.name)}</div>
        <div style="font-size:12.5px;color:#8A94A3;">${st === 'INJURED' ? esc(a.notes || 'Lesão') : `Recovery ${r} · ${STATUS_META[st].label}`}</div></div>
      <div style="font-family:'Space Grotesk';font-weight:700;font-size:20px;color:${STATUS_META[st].color};">${st === 'INJURED' ? '—' : r}</div>
    </div>`).join('') || `<div style="text-align:center;color:#5A6472;font-size:13.5px;padding:30px 0;">Nenhum atleta encontrado.</div>`;
  return `<div class="pagepad">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;"><div style="font-family:'Space Grotesk';font-weight:700;font-size:24px;">Atletas</div>
      <div class="tap" data-action="future" data-arg="Cadastro de novos atletas" style="width:38px;height:38px;border-radius:12px;background:#14181F;display:flex;align-items:center;justify-content:center;">${ICONS.plus}</div></div>
    <div style="display:flex;align-items:center;gap:10px;background:#14181F;border-radius:13px;padding:0 15px;margin-bottom:14px;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A6472" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>
      <input id="athlete-search" placeholder="Buscar atleta" value="${esc(ctx.athleteSearch || '')}" style="flex:1;background:none;border:none;outline:none;color:#F4F6F8;font-family:'Manrope';font-size:14px;padding:12px 0;"></div>
    <div style="display:flex;gap:8px;margin-bottom:16px;overflow:hidden;">${chips.map(([k, l]) => `<div class="tap" data-action="athletes-filter" data-arg="${k}" style="padding:8px 14px;border-radius:999px;background:${filter === k ? '#FF6A3D' : '#14181F'};color:${filter === k ? '#0B0E12' : '#8A94A3'};font-size:12.5px;font-weight:${filter === k ? 700 : 600};white-space:nowrap;">${l}</div>`).join('')}</div>
    <div style="display:flex;flex-direction:column;gap:9px;">${rows}</div>
  </div>${tabbar('coachAthletes', 'TRAINER')}`;
}

// ── PERFIL DO ATLETA ─────────────────────────────────────────────────────────
export function coachProfile(ctx) {
  const a = db.get('athletes', ctx.athleteId) || db.list('athletes')[0];
  const st = athleteStatus(a), c = latestCheckin(a.id);
  const r = recoveryOf(a);
  const wk = weekLoad(a.id, mondayOf(todayISO()));
  const prevWk = weekLoad(a.id, addDays(mondayOf(todayISO()), -7));
  const ratio = prevWk ? (wk / prevWk).toFixed(2) : '—';
  const meta = STATUS_META[st];
  return `<div class="pagepad" style="padding-top:58px;">
    ${header(' ', '', '')}
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;margin-top:-46px;">
      ${avatar(initialsOf(a.name), 64, 'linear-gradient(135deg,#2A323D,#3A4350)', '#F4F6F8', '20px')}
      <div style="flex:1;"><div style="font-family:'Space Grotesk';font-weight:700;font-size:21px;">${esc(a.name)}</div>
        <div style="font-size:13px;color:#8A94A3;">${a.age} anos · Dupla c/ ${esc(a.partnerName)} · ${esc(a.notes || a.category)}</div>
        <div style="display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:999px;background:${meta.color}21;margin-top:8px;"><div style="width:6px;height:6px;border-radius:50%;background:${meta.color};"></div><span style="font-size:12px;font-weight:700;color:${meta.color};">${meta.label}</span></div></div></div>
    <div style="display:flex;gap:6px;background:#14181F;border-radius:13px;padding:5px;margin-bottom:16px;">
      <div style="flex:1;text-align:center;padding:9px;border-radius:9px;background:#FF6A3D;color:#0B0E12;font-weight:700;font-size:13px;">Visão geral</div>
      <div class="tap" data-action="go" data-screen="coachAssessment" style="flex:1;text-align:center;padding:9px;border-radius:9px;color:#8A94A3;font-weight:600;font-size:13px;">Avaliação</div>
      <div class="tap" data-action="go" data-screen="coachHistory" style="flex:1;text-align:center;padding:9px;border-radius:9px;color:#8A94A3;font-weight:600;font-size:13px;">Histórico</div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:14px;">
      <div class="card" style="border-radius:16px;padding:15px;"><div class="seclabel" style="letter-spacing:.1em;">RECOVERY</div><div style="display:flex;align-items:baseline;gap:6px;margin-top:6px;"><span style="font-family:'Space Grotesk';font-weight:700;font-size:30px;color:${meta.color};">${st === 'INJURED' ? '—' : r}</span></div></div>
      <div class="card" style="border-radius:16px;padding:15px;"><div class="seclabel" style="letter-spacing:.1em;">SONO</div><div style="display:flex;align-items:baseline;gap:6px;margin-top:6px;"><span style="font-family:'Space Grotesk';font-weight:700;font-size:30px;">${c ? c.sleepHours.toFixed(1).replace('.', ':').replace(':0', ':00').replace(/:(\d)$/, ':$10') : '—'}</span><span style="font-size:13px;color:#8A94A3;">h</span></div></div>
      <div class="card" style="border-radius:16px;padding:15px;"><div class="seclabel" style="letter-spacing:.1em;">CARGA SEMANA</div><div style="display:flex;align-items:baseline;gap:6px;margin-top:6px;"><span style="font-family:'Space Grotesk';font-weight:700;font-size:30px;">${wk.toLocaleString('pt-BR')}</span><span style="font-size:12px;color:#8A94A3;">UA</span></div></div>
      <div class="card" style="border-radius:16px;padding:15px;"><div class="seclabel" style="letter-spacing:.1em;">VS SEMANA ANT.</div><div style="display:flex;align-items:baseline;gap:6px;margin-top:6px;"><span style="font-family:'Space Grotesk';font-weight:700;font-size:30px;color:${ratio !== '—' && ratio > 1.3 ? '#FFC24B' : '#34E0A1'};">${ratio}</span></div></div></div>
    <button class="tap btn-primary" data-action="go" data-screen="coachDecision" style="box-shadow:0 12px 30px -8px rgba(255,106,61,.5);">Ver decisão da semana →</button>
    <button class="tap btn-dark" data-action="go" data-screen="coachCopiloto" style="margin-top:10px;">⚡ Copiloto de sessão</button>
  </div>`;
}

// ── AVALIAÇÃO ────────────────────────────────────────────────────────────────
export function coachAssessment(ctx) {
  const a = db.get('athletes', ctx.athleteId) || db.list('athletes')[0];
  const list = db.list('assessments', x => x.athleteId === a.id).sort((x, y) => y.date.localeCompare(x.date));
  const cur = list[0], prev = list[1];
  const bar = (label, value, unit, pct, color, delta) => `
    <div class="card" style="padding:14px 16px;${color === '#FFC24B' ? 'border-color:rgba(255,194,75,.25);' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;"><span style="font-size:14px;font-weight:600;">${label}</span>
        <span style="font-family:'Space Grotesk';font-weight:700;font-size:16px;color:${color};">${value} ${unit}${delta ? ` ${delta}` : ''}</span></div>
      <div style="height:6px;background:#1C232C;border-radius:3px;"><div style="width:${pct}%;height:100%;background:${color};border-radius:3px;"></div></div></div>`;
  let body = `<div style="text-align:center;color:#5A6472;font-size:13.5px;padding:26px 0;">Nenhuma avaliação cadastrada ainda.</div>`;
  if (cur) {
    const d = (k, better = 'up') => { if (!prev) return ''; const df = +(cur[k] - prev[k]).toFixed(2); if (!df) return ''; const good = better === 'up' ? df > 0 : df < 0; return `<span style="color:${good ? '#34E0A1' : '#FFC24B'};">${df > 0 ? '▲' : '▼'}${Math.abs(df)}</span>`; };
    body = `
    <div style="background:linear-gradient(135deg,#15110E,#0D1015);border:1px solid rgba(255,106,61,.2);border-radius:18px;padding:18px;margin-bottom:16px;display:flex;align-items:center;gap:16px;">
      ${ring(cur.generalIndex, '#FF6A3D', 62, 48, 19)}
      <div><div class="seclabel" style="letter-spacing:.1em;">ÍNDICE FÍSICO GERAL</div>
      <div style="font-size:14px;color:#C7CFDA;margin-top:3px;line-height:1.4;">${esc(cur.notes || `Avaliado em ${fmtShort(cur.date)}.`)}</div></div></div>
    <div class="seclabel" style="margin:4px 4px 12px;">BATERIA DE TESTES · ${fmtShort(cur.date)}</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${bar('Salto vertical (CMJ)', cur.cmj, 'cm', Math.min(100, cur.cmj * 2), '#34E0A1', d('cmj', 'up'))}
      ${cur.sj ? bar('Squat jump (SJ)', cur.sj, 'cm', Math.min(100, cur.sj * 2), '#34E0A1', d('sj', 'up')) : ''}
      ${cur.sprint5m ? bar('Sprint 5m', cur.sprint5m, 's', Math.min(100, Math.max(10, 100 - (cur.sprint5m - 0.9) * 120)), '#34E0A1', d('sprint5m', 'down')) : ''}
      ${cur.sprint10m ? bar('Sprint 10m', cur.sprint10m, 's', Math.min(100, Math.max(10, 100 - (cur.sprint10m - 1.4) * 90)), '#34E0A1', d('sprint10m', 'down')) : ''}
      ${cur.mbLateralD ? bar('MB Lateral D', cur.mbLateralD, 'm', Math.min(100, cur.mbLateralD * 22), '#5B9DFF', d('mbLateralD', 'up')) : ''}
      ${cur.mbLateralE ? bar('MB Lateral E', cur.mbLateralE, 'm', Math.min(100, cur.mbLateralE * 22), '#5B9DFF', d('mbLateralE', 'up')) : ''}
      ${cur.mbLateralD && cur.mbLateralE ? `<div class="card" style="padding:12px 16px;${cur.mbAsym > 15 ? 'border-color:rgba(255,93,93,.3);' : cur.mbAsym > 10 ? 'border-color:rgba(255,194,75,.25);' : ''}"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:14px;font-weight:600;">Assimetria MB</span><span style="font-family:'Space Grotesk';font-weight:700;font-size:16px;color:${cur.mbAsym > 15 ? '#FF5D5D' : cur.mbAsym > 10 ? '#FFC24B' : '#34E0A1'};">${cur.mbAsym}%</span></div><div style="font-size:11.5px;color:#5A6472;margin-top:4px;">${cur.mbAsym > 15 ? '⚠ assimetria alta — avaliar' : cur.mbAsym > 10 ? '⚡ assimetria moderada' : '✓ simétrico'}</div></div>` : ''}
      ${cur.agility505 ? bar('5-0-5 areia', cur.agility505, 's', Math.min(100, Math.max(10, 100 - (cur.agility505 - 2.0) * 80)), '#8A94A3', d('agility505', 'down')) : ''}
      ${cur.ankleMobility ? bar('Mobilidade tornozelo', cur.ankleMobility, '°', Math.min(100, cur.ankleMobility * 1.6), cur.ankleMobility < 35 ? '#FFC24B' : '#34E0A1', d('ankleMobility', 'up')) : ''}
    </div>`;
  }
  return `<div class="pagepad" style="padding-top:58px;">
    ${header('Avaliação física', `${esc(a.name)}${cur ? ' · ' + fmtShort(cur.date) : ''}`)}
    ${body}
    <button class="tap btn-dark" data-action="assessment-new" style="margin-top:16px;">Nova avaliação</button>
  </div>`;
}

// ── HISTÓRICO DE CARGA ──────────────────────────────────────────────────────
export function coachHistory(ctx) {
  const a = db.get('athletes', ctx.athleteId) || db.list('athletes')[0];
  const mon = mondayOf(todayISO());
  const weeks = [3, 2, 1, 0].map(i => ({ start: addDays(mon, -7 * i), label: `S${4 - i}` }));
  const loads = weeks.map(w => weekLoad(a.id, w.start));
  const max = Math.max(...loads, 1);
  const curLoad = loads[3];
  const okRange = curLoad > 0 && (!loads[2] || curLoad / Math.max(loads[2], 1) < 1.4);
  const bars = weeks.map((w, i) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
      <div style="width:100%;height:${Math.max(8, Math.round(70 * loads[i] / max))}px;background:${i === 3 ? '#FF6A3D' : '#2A323D'};border-radius:4px;"></div>
      <span style="font-size:10px;color:${i === 3 ? '#F4F6F8' : '#5A6472'};">${w.label}</span></div>`).join('');
  const typeIcon = { 'Força': ['#FF6A3D', ICONS.barbell('#FF6A3D')], 'Potência': ['#5B9DFF', ICONS.bolt('#5B9DFF')], 'Regenerativo': ['#34E0A1', ICONS.clock('#34E0A1')], 'Quadra': ['#FFC24B', ICONS.bolt('#FFC24B')] };
  const recent = db.list('sessions', s => s.athleteId === a.id && s.date <= todayISO()).sort((x, y) => y.date.localeCompare(x.date)).slice(0, 5);
  const rows = recent.map(s => {
    const [color, icon] = typeIcon[s.type] || typeIcon['Quadra'];
    const dd = diffDays(todayISO(), s.date);
    const when = dd === 0 ? 'Hoje' : dd === 1 ? 'Ontem' : `${dd} dias`;
    return `<div class="tap" data-action="session-edit" data-arg="${s.id}" style="display:flex;align-items:center;gap:13px;background:#0D1015;border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:13px 15px;">
      <div style="width:38px;height:38px;border-radius:11px;background:${color}21;display:flex;align-items:center;justify-content:center;">${icon}</div>
      <div style="flex:1;"><div style="font-size:14px;font-weight:600;">${esc(s.title)}</div>
      <div style="font-size:12px;color:#8A94A3;">${when} · ${s.status === 'COMPLETED' ? `RPE ${s.rpeFinal}` : `alvo ${s.targetRpe}`} · ${s.durationMinutes} min${s.status === 'PLANNED' ? ' · planejada' : ''}</div></div>
      <span style="font-family:'Space Grotesk';font-weight:700;font-size:14px;color:#8A94A3;">${sessionLoad(s)} UA</span></div>`;
  }).join('') || `<div style="text-align:center;color:#5A6472;font-size:13.5px;padding:20px 0;">Sem sessões registradas.</div>`;
  return `<div class="pagepad" style="padding-top:58px;">
    ${header('Histórico de carga', esc(a.name))}
    <div class="card" style="border-radius:18px;padding:16px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;">
        <div><div class="seclabel" style="letter-spacing:.1em;">CARGA SEMANAL (UA)</div><div style="font-family:'Space Grotesk';font-weight:700;font-size:26px;margin-top:3px;">${curLoad.toLocaleString('pt-BR')}</div></div>
        <div style="font-size:12px;color:${okRange ? '#34E0A1' : '#FFC24B'};background:${okRange ? 'rgba(52,224,161,.12)' : 'rgba(255,194,75,.12)'};padding:5px 10px;border-radius:8px;">${okRange ? 'ótima faixa' : 'salto de carga'}</div></div>
      <div style="display:flex;align-items:flex-end;gap:8px;height:86px;">${bars}</div></div>
    <div class="seclabel" style="margin:4px 4px 12px;">SESSÕES RECENTES</div>
    <div style="display:flex;flex-direction:column;gap:9px;">${rows}</div>
  </div>`;
}

// ── PLANO SEMANAL ───────────────────────────────────────────────────────────
export function coachPlan(ctx) {
  const a = db.get('athletes', ctx.athleteId) || db.list('athletes')[0];
  if (!ctx.planWeek) ctx.planWeek = mondayOf(todayISO());
  const mon = ctx.planWeek;
  const weekNum = Math.ceil((new Date(mon + 'T12:00:00') - new Date(new Date(mon + 'T12:00:00').getFullYear(), 0, 1)) / 604800000);
  const typeStyle = { 'Força': ['rgba(255,106,61,.12)', '#FF6A3D'], 'Potência': ['rgba(91,157,255,.12)', '#5B9DFF'], 'Regenerativo': ['rgba(52,224,161,.1)', '#34E0A1'], 'Quadra': ['rgba(255,194,75,.12)', '#FFC24B'] };
  const travels = db.list('travels');
  const days = [];
  let planned = 0;
  for (let i = 0; i < 7; i++) {
    const date = addDays(mon, i);
    const sess = db.list('sessions', s => s.athleteId === a.id && s.date === date);
    const trav = travels.find(tv => tv.departureDate === date || tv.arrivalDate === date);
    let inner;
    if (sess.length) {
      inner = sess.map(s => {
        planned += sessionLoad(s);
        const [bg, bc] = typeStyle[s.type] || typeStyle['Quadra'];
        return `<div class="tap" data-action="session-edit" data-arg="${s.id}" style="flex:1;background:${bg};border-left:3px solid ${bc};border-radius:10px;padding:11px 13px;">
          <div style="font-size:13.5px;font-weight:700;">${esc(s.title)}${s.status === 'COMPLETED' ? ' ✓' : ''}</div>
          <div style="font-size:11.5px;color:#8A94A3;">${s.durationMinutes} min · RPE ${s.status === 'COMPLETED' ? s.rpeFinal : s.targetRpe} · ${sessionLoad(s)} UA</div></div>`;
      }).join('');
    } else if (trav) {
      inner = `<div class="tap" data-action="go" data-screen="coachTravels" style="flex:1;background:#14181F;border-left:3px solid #8A94A3;border-radius:10px;padding:11px 13px;">
        <div style="font-size:13.5px;font-weight:700;">Viagem ✈ ${esc(trav.origin)} → ${esc(trav.destination)}</div>
        <div style="font-size:11.5px;color:#8A94A3;">descanso ativo · ver viagem</div></div>`;
    } else {
      inner = `<div class="tap" data-action="session-new" data-arg="${date}" style="flex:1;border:1.5px dashed rgba(255,255,255,.12);border-radius:10px;padding:11px 13px;display:flex;align-items:center;gap:8px;color:#5A6472;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5A6472" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg><span style="font-size:13px;">Adicionar sessão</span></div>`;
    }
    const isToday = date === todayISO();
    days.push(`<div style="display:flex;gap:11px;align-items:stretch;">
      <div style="width:42px;flex-shrink:0;text-align:center;padding-top:10px;">
        <div style="font-size:11px;color:${isToday ? '#FF6A3D' : '#5A6472'};font-weight:700;">${fmtDow(date)}</div>
        <div style="font-family:'Space Grotesk';font-weight:700;font-size:16px;${isToday ? 'color:#FF6A3D;' : ''}">${fmtDayNum(date)}</div></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:6px;">${inner}</div></div>`);
  }
  const athOptions = db.list('athletes').map(x => `<option value="${x.id}" ${x.id === a.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
  return `<div class="pagepad" style="padding-bottom:100px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
      <div style="font-family:'Space Grotesk';font-weight:700;font-size:21px;">Semana ${weekNum}</div>
      <div style="display:flex;gap:8px;">
        <div class="tap backbtn" data-action="plan-week" data-arg="-1" style="width:34px;height:34px;border-radius:10px;">${ICONS.back.replace('width="18" height="18"', 'width="16" height="16"')}</div>
        <div class="tap backbtn" data-action="plan-week" data-arg="1" style="width:34px;height:34px;border-radius:10px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4F6F8" stroke-width="2.2"><path d="m9 18 6-6-6-6"/></svg></div></div></div>
    <select id="plan-athlete" class="f-input" style="margin-bottom:12px;background:#14181F;border:none;font-size:13px;color:#8A94A3;padding:8px 12px;width:auto;">${athOptions}</select>
    <div style="display:flex;flex-direction:column;gap:8px;">${days.join('')}</div>
    <div style="display:flex;align-items:center;justify-content:space-between;background:#0D1015;border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:14px 16px;margin-top:14px;">
      <div><div class="seclabel" style="letter-spacing:.1em;">CARGA PLANEJADA</div><div style="font-family:'Space Grotesk';font-weight:700;font-size:18px;">${planned.toLocaleString('pt-BR')} UA</div></div>
      <div style="font-size:12px;color:#34E0A1;background:rgba(52,224,161,.12);padding:6px 11px;border-radius:8px;">equilíbrio ✓</div></div>
  </div>${tabbar('coachPlan', 'TRAINER')}`;
}

// ── DECISÃO DA SEMANA ───────────────────────────────────────────────────────
export function coachDecision(ctx) {
  const a = db.get('athletes', ctx.athleteId) || db.list('athletes')[0];
  const st = athleteStatus(a), r = recoveryOf(a), c = latestCheckin(a.id);
  const dec = (db.all().decisions || {})[a.id] || null;
  const wk = weekLoad(a.id, mondayOf(todayISO())), prevWk = weekLoad(a.id, addDays(mondayOf(todayISO()), -7));
  const ratio = prevWk ? (wk / prevWk).toFixed(2) : null;
  const nt = nextTournament(a.id);
  const sug = dec ? dec.decision : (st === 'INJURED' ? 'ENCAMINHAR' : st === 'ATTENTION' ? 'REDUZIR' : st === 'COMPETING_SOON' ? 'MANTER' : 'PROGREDIR');
  const sugLabel = { PROGREDIR: 'PROGREDIR CARGA +10%', MANTER: 'MANTER PLANO', REDUZIR: 'REDUZIR CARGA −20%', DESCARREGAR: 'SEMANA DE DESCARGA', REAVALIAR: 'REAVALIAR · ANTECIPAR TESTES', ENCAMINHAR: 'ENCAMINHAR · FISIO/MÉDICO' }[sug] || sug;
  const note = dec ? dec.note : { PROGREDIR: 'Prontidão alta e estável. Janela de adaptação aberta — aumentar volume antes do próximo torneio.', MANTER: 'Competição próxima: manter estímulo e priorizar frescor.', REDUZIR: 'Sinais de fadiga/sono baixo. Reduzir volume e reavaliar em 48h.', REAVALIAR: 'Gargalo de informação: antecipar bateria de testes antes de mudar a carga.', ENCAMINHAR: 'Gargalo clínico: encaminhar para fisio/médico antes de progredir.', DESCARREGAR: 'Bloco longo sem descarga: programar semana leve.' }[sug];
  const evid = [];
  evid.push([r >= 80 ? '#34E0A1' : r >= 65 ? '#FFC24B' : '#FF5D5D', `Prontidão ${r}${c ? ` · sono ${c.sleepHours.toFixed(1)}h` : ''}`]);
  if (ratio) evid.push([+ratio <= 1.3 ? '#34E0A1' : '#FFC24B', `Carga semana atual:anterior em ${ratio}`]);
  if (nt) evid.push(['#FFC24B', `${nt.name} em ${diffDays(nt.startDate, todayISO())} dias — reduzir 3 dias antes`]);
  if (c && c.painScore > 0) evid.push([c.painScore >= 6 ? '#FF5D5D' : '#FFC24B', `Dor ${esc(c.painLocation || '')} ${c.painScore}/10`]);
  const evidHtml = evid.map(([color, txt]) => `<div style="display:flex;align-items:center;gap:11px;">${color === '#34E0A1' ? ICONS.check('#34E0A1') : ICONS.warn(color)}<span style="font-size:13.5px;color:#C7CFDA;">${txt}</span></div>`).join('');
  return `<div class="pagepad" style="padding-top:58px;">
    <div style="position:absolute;inset:0;background:radial-gradient(420px 300px at 50% 12%,rgba(255,106,61,.16),transparent 62%);pointer-events:none;"></div>
    <div style="position:relative;">
    <div style="display:flex;align-items:center;gap:13px;margin-bottom:16px;"><div class="tap backbtn" data-action="back">${ICONS.back}</div>
      <div><div style="font-size:11px;font-weight:700;letter-spacing:.14em;color:#FF6A3D;">DECISÃO DA SEMANA</div>
      <div style="font-family:'Space Grotesk';font-weight:700;font-size:20px;">O que fazer com o atleta</div></div></div>
    <div style="background:#0D1015;border:1px solid rgba(255,106,61,.22);border-radius:22px;padding:22px;box-shadow:0 24px 50px -20px rgba(255,106,61,.25);">
      <div style="display:flex;align-items:center;gap:13px;margin-bottom:18px;">${avatar(initialsOf(a.name), 50, 'linear-gradient(135deg,#2A323D,#3A4350)', '#F4F6F8', '15px')}
        <div style="flex:1;"><div style="font-weight:700;font-size:17px;">${esc(a.name)}</div>
        <div style="font-size:12.5px;color:${STATUS_META[st].color};">Recovery ${st === 'INJURED' ? '—' : r} · ${STATUS_META[st].label}</div></div>
        ${dec ? '<div style="font-size:11px;color:#34E0A1;">decidido ✓</div>' : '<div style="font-size:11px;color:#5A6472;">sugestão</div>'}</div>
      <div style="display:inline-flex;align-items:center;gap:8px;padding:9px 15px;border-radius:999px;background:#FF6A3D;margin-bottom:14px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#0B0E12"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>
        <span style="font-size:13px;font-weight:800;color:#0B0E12;">${esc(sugLabel)}</span></div>
      <div style="font-size:14.5px;color:#C7CFDA;line-height:1.5;margin-bottom:18px;">${esc(note)}</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">${evidHtml}</div>
      <div style="display:flex;gap:11px;">
        <button class="tap btn-primary" data-action="decision-apply" data-arg="${sug}" style="flex:1;padding:15px;">Aplicar ao plano</button>
        <button class="tap btn-dark" data-action="decision-adjust" style="padding:15px 18px;width:auto;">Ajustar</button></div>
    </div></div>
  </div>`;
}

// ── RELATÓRIOS ──────────────────────────────────────────────────────────────
export function coachReports() {
  const team = teamReadiness();
  const totalLoad = db.list('athletes').reduce((s, a) => s + weekLoad(a.id, mondayOf(todayISO())), 0);
  const injured = db.list('athletes').filter(a => athleteStatus(a) === 'INJURED').length;
  const reports = db.list('reports').sort((a, b) => b.createdAt - a.createdAt);
  const icons = { individual: ['#FF5D5D', ICONS.doc('#FF5D5D')], equipe: ['#5B9DFF', `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#5B9DFF" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>`], mensal: ['#34E0A1', `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#34E0A1" stroke-width="2"><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 5-6"/></svg>`] };
  const rows = reports.map(rp => {
    const [color, icon] = icons[rp.type] || icons.individual;
    return `<div class="tap" data-action="report-view" data-arg="${rp.id}" style="display:flex;align-items:center;gap:13px;background:#0D1015;border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:14px 15px;">
      <div style="width:40px;height:40px;border-radius:11px;background:${color}1f;display:flex;align-items:center;justify-content:center;">${icon}</div>
      <div style="flex:1;"><div style="font-size:14.5px;font-weight:600;">${esc(rp.title)}</div>
      <div style="font-size:12px;color:#8A94A3;">${esc(rp.type)} · ${fmtTimeAgo(rp.createdAt)}</div></div>
      <div class="tap" data-action="future" data-arg="Exportação em PDF">${ICONS.download}</div></div>`;
  }).join('') || `<div style="text-align:center;color:#5A6472;font-size:13.5px;padding:20px 0;">Nenhum relatório gerado.</div>`;
  return `<div class="pagepad">
    <div style="font-family:'Space Grotesk';font-weight:700;font-size:24px;margin-bottom:18px;">Relatórios</div>
    <div style="background:linear-gradient(135deg,#1A1410,#0D1015);border:1px solid rgba(255,106,61,.2);border-radius:20px;padding:20px;margin-bottom:18px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:.12em;color:#FF6A3D;margin-bottom:8px;">RESUMO DA EQUIPE · SEMANA ATUAL</div>
      <div style="font-size:16px;font-weight:600;line-height:1.45;margin-bottom:16px;">Prontidão média da equipe em <span style="color:#34E0A1;">${team}</span>. ${injured ? `${injured} atleta em retorno de lesão.` : 'Nenhuma lesão ativa nova.'}</div>
      <div style="display:flex;gap:10px;">
        <div style="flex:1;background:rgba(255,255,255,.04);border-radius:12px;padding:12px;text-align:center;"><div style="font-family:'Space Grotesk';font-weight:700;font-size:22px;">${team}%</div><div style="font-size:11px;color:#8A94A3;">prontidão</div></div>
        <div style="flex:1;background:rgba(255,255,255,.04);border-radius:12px;padding:12px;text-align:center;"><div style="font-family:'Space Grotesk';font-weight:700;font-size:22px;">${(totalLoad / 1000).toFixed(1)}k</div><div style="font-size:11px;color:#8A94A3;">carga UA</div></div>
        <div style="flex:1;background:rgba(255,255,255,.04);border-radius:12px;padding:12px;text-align:center;"><div style="font-family:'Space Grotesk';font-weight:700;font-size:22px;">${injured}</div><div style="font-size:11px;color:#8A94A3;">lesões</div></div></div></div>
    <div class="seclabel" style="margin:4px 4px 12px;">GERADOS RECENTEMENTE</div>
    <div style="display:flex;flex-direction:column;gap:9px;">${rows}</div>
    <button class="tap btn-primary" data-action="report-new" style="margin-top:16px;box-shadow:0 12px 30px -8px rgba(255,106,61,.4);">+ Novo relatório</button>
  </div>${tabbar('coachReports', 'TRAINER')}`;
}

// ── CALENDÁRIO ──────────────────────────────────────────────────────────────
export function coachCalendar() {
  const ts = db.list('tournaments').sort((a, b) => a.startDate.localeCompare(b.startDate));
  const next = ts.find(t => t.startDate >= todayISO());
  const nextHtml = next ? `
    <div class="tap" data-action="go" data-screen="coachTravels" style="background:linear-gradient(135deg,#10161F,#0D1015);border:1px solid rgba(91,157,255,.25);border-radius:20px;padding:20px;margin-bottom:18px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div><div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:#5B9DFF;">PRÓXIMO · EM ${diffDays(next.startDate, todayISO())} DIAS</div>
          <div style="font-family:'Space Grotesk';font-weight:700;font-size:22px;margin-top:4px;">${esc(next.name)}</div>
          <div style="font-size:13px;color:#8A94A3;margin-top:2px;">${esc(next.location)} · ${esc(next.level)} · ${fmtShort(next.startDate)}–${fmtShort(next.endDate)}</div></div>
        <div style="text-align:center;background:rgba(91,157,255,.14);border-radius:13px;padding:10px 12px;"><div style="font-family:'Space Grotesk';font-weight:700;font-size:24px;color:#5B9DFF;">${diffDays(next.startDate, todayISO())}</div><div style="font-size:10px;color:#5B9DFF;">dias</div></div></div>
      <div style="display:flex;align-items:center;margin-top:16px;">
        ${(next.athletes || []).slice(0, 4).map((id, i) => { const at = db.get('athletes', id); return at ? `<div style="width:30px;height:30px;border-radius:50%;background:#2A323D;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid #0D1015;${i ? 'margin-left:-8px;' : ''}">${initialsOf(at.name)}</div>` : ''; }).join('')}
        <span style="font-size:12.5px;color:#8A94A3;margin-left:12px;">${(next.athletes || []).length} atleta(s) confirmados</span></div></div>` : '';
  const rows = ts.map(t => `
    <div class="tap" data-action="tournament-edit" data-arg="${t.id}" style="display:flex;align-items:center;gap:14px;background:#0D1015;border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:13px 15px;">
      <div style="text-align:center;width:38px;"><div style="font-family:'Space Grotesk';font-weight:700;font-size:18px;">${fmtDayNum(t.startDate)}</div><div style="font-size:10px;color:#5A6472;">${fmtShort(t.startDate).split(' ')[1].toUpperCase()}</div></div>
      <div style="width:1px;height:34px;background:rgba(255,255,255,.08);"></div>
      <div style="flex:1;"><div style="font-size:14.5px;font-weight:700;">${esc(t.name)}</div><div style="font-size:12px;color:#8A94A3;">${esc(t.location)} · ${esc(t.level)}</div></div>
      ${t.isMainTarget ? '<div style="font-size:11px;color:#FF6A3D;background:rgba(255,106,61,.12);padding:5px 9px;border-radius:7px;">alvo ★</div>' : `<div style="font-size:11px;color:#5B9DFF;background:rgba(91,157,255,.12);padding:5px 9px;border-radius:7px;">${(t.athletes || []).length} atletas</div>`}
    </div>`).join('') || `<div style="text-align:center;color:#5A6472;font-size:13.5px;padding:20px 0;">Nenhum torneio cadastrado.</div>`;
  return `<div class="pagepad" style="padding-top:58px;">
    ${header('Calendário', '', `<div class="tap" data-action="tournament-new" style="width:38px;height:38px;border-radius:12px;background:#14181F;display:flex;align-items:center;justify-content:center;">${ICONS.plus}</div>`)}
    ${nextHtml}
    <div class="seclabel" style="margin:4px 4px 12px;">PRÓXIMOS TORNEIOS</div>
    <div style="display:flex;flex-direction:column;gap:9px;">${rows}</div>
  </div>`;
}

// ── VIAGENS ─────────────────────────────────────────────────────────────────
export function coachTravels() {
  const travels = db.list('travels').sort((a, b) => a.departureDate.localeCompare(b.departureDate));
  const tv = travels.find(t => t.arrivalDate >= todayISO()) || travels[0];
  let main = `<div style="text-align:center;color:#5A6472;font-size:13.5px;padding:26px 0;">Nenhuma viagem cadastrada.</div>`;
  let extra = '';
  if (tv) {
    const tour = db.get('tournaments', tv.tournamentId);
    main = `
    <div class="tap" data-action="travel-edit" data-arg="${tv.id}" style="background:#0D1015;border:1px solid rgba(255,255,255,.06);border-radius:20px;padding:20px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="text-align:center;"><div style="font-family:'Space Grotesk';font-weight:700;font-size:24px;">${esc(tv.origin)}</div><div style="font-size:12px;color:#8A94A3;">${fmtShort(tv.departureDate)}</div></div>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;padding:0 12px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#FF6A3D"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>
          <div style="width:100%;height:1px;background:rgba(255,255,255,.1);margin-top:6px;"></div>
          <div style="font-size:11px;color:#5A6472;margin-top:6px;">${tour ? esc(tour.name) : 'viagem'}</div></div>
        <div style="text-align:center;"><div style="font-family:'Space Grotesk';font-weight:700;font-size:24px;">${esc(tv.destination)}</div><div style="font-size:12px;color:#8A94A3;">${fmtShort(tv.arrivalDate)}</div></div></div></div>`;
    extra = `
    <div style="display:flex;flex-direction:column;gap:9px;">
      <div class="card" style="display:flex;align-items:center;gap:13px;padding:14px 15px;">
        <div style="width:40px;height:40px;border-radius:11px;background:rgba(91,157,255,.12);display:flex;align-items:center;justify-content:center;"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#5B9DFF" stroke-width="2"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M15 9h.01M9 13h.01M15 13h.01"/></svg></div>
        <div style="flex:1;"><div style="font-size:14.5px;font-weight:600;">${esc(tv.hotel || 'Hotel a definir')}</div><div style="font-size:12px;color:#8A94A3;">${fmtShort(tv.arrivalDate)} em diante</div></div>
        <span style="font-size:12px;color:#34E0A1;">confirmado</span></div>
      ${tv.notes ? `<div style="background:rgba(255,194,75,.08);border:1px solid rgba(255,194,75,.2);border-radius:14px;padding:14px 16px;display:flex;gap:11px;align-items:center;">${ICONS.warn('#FFC24B')}<span style="font-size:13px;color:#C7CFDA;line-height:1.4;">${esc(tv.notes)}</span></div>` : ''}
    </div>`;
  }
  return `<div class="pagepad" style="padding-top:58px;">
    ${header('Viagens', tv ? `${esc(tv.origin)} → ${esc(tv.destination)}` : '', `<div class="tap" data-action="travel-new" style="width:38px;height:38px;border-radius:12px;background:#14181F;display:flex;align-items:center;justify-content:center;">${ICONS.plus}</div>`)}
    ${main}${extra}
  </div>`;
}

// ── NOTIFICAÇÕES ────────────────────────────────────────────────────────────
export function coachNotifications() {
  const me = auth.current();
  const list = db.list('notifications', n => n.userId === me.id).sort((a, b) => b.createdAt - a.createdAt);
  const colors = { alert: '#FF5D5D', warning: '#FFC24B', success: '#34E0A1', travel: '#5B9DFF', info: '#2A323D', message: '#FF6A3D' };
  const today = list.filter(n => Date.now() - n.createdAt < 20 * 3600000);
  const older = list.filter(n => Date.now() - n.createdAt >= 20 * 3600000);
  const row = (n) => `<div class="tap" data-action="notif-read" data-arg="${n.id}" style="display:flex;gap:13px;background:${n.read ? '#0D1015' : (colors[n.type] || '#FF6A3D') + '10'};border:1px solid ${n.read ? 'rgba(255,255,255,.06)' : (colors[n.type] || '#FF6A3D') + '2e'};border-radius:14px;padding:14px 15px;">
    <div style="width:9px;height:9px;border-radius:50%;background:${n.read ? '#2A323D' : colors[n.type] || '#FF6A3D'};margin-top:5px;flex-shrink:0;"></div>
    <div><div style="font-size:14px;font-weight:600;line-height:1.35;${n.read ? 'color:#8A94A3;' : ''}">${esc(n.title)}</div>
    <div style="font-size:12px;color:${n.read ? '#5A6472' : '#8A94A3'};margin-top:3px;">${esc(n.description)} · ${fmtTimeAgo(n.createdAt)}</div></div></div>`;
  return `<div class="pagepad" style="padding-top:58px;">
    ${header('Notificações')}
    ${today.length ? `<div class="seclabel" style="margin:0 4px 12px;">HOJE</div><div style="display:flex;flex-direction:column;gap:9px;margin-bottom:18px;">${today.map(row).join('')}</div>` : ''}
    ${older.length ? `<div class="seclabel" style="margin:0 4px 12px;">ANTERIORES</div><div style="display:flex;flex-direction:column;gap:9px;">${older.map(row).join('')}</div>` : ''}
    ${!list.length ? '<div style="text-align:center;color:#5A6472;font-size:13.5px;padding:26px 0;">Sem notificações.</div>' : ''}
  </div>`;
}

// ── RADAR DE EVIDÊNCIAS v1 ───────────────────────────────────────────────────
const RADAR_CAT_META = {
  RISCO:       { color: '#FF5D5D', bg: 'rgba(255,93,93,',   label: 'RISCO' },
  ATENÇÃO:     { color: '#FFC24B', bg: 'rgba(255,194,75,',  label: 'ATENÇÃO' },
  OPORTUNIDADE:{ color: '#34E0A1', bg: 'rgba(52,224,161,',  label: 'OPORTUNIDADE' },
};
const RADAR_CONF_COLOR = { ALTA: '#34E0A1', MÉDIA: '#FFC24B', BAIXA: '#8A94A3' };

function radarClassify(a) {
  const result = analyzeAthleteWeek({
    athlete: a, today: todayISO(), checkins: db.list('checkins'), sessions: db.list('sessions'),
    assessments: db.list('assessments'), tournaments: db.list('tournaments'), travels: db.list('travels'),
  });
  return { ...result, sugAction: result.decision };
}

export const radarAnalysis = (athlete) => radarClassify(athlete);

const SUG_LABEL = {
  PROGREDIR: 'PROGREDIR CARGA +10%', MANTER: 'MANTER PLANO', REDUZIR: 'REDUZIR CARGA −20%',
  DESCARREGAR: 'SEMANA DE DESCARGA', REAVALIAR: 'REAVALIAR · ANTECIPAR TESTES', ENCAMINHAR: 'ENCAMINHAR · FISIO/MÉDICO',
};

export function coachRadar() {
  const athletes = db.list('athletes');
  if (!athletes.length) return `<div class="pagepad" style="padding-top:58px;">${header('Radar de Evidências', 'v1')}<div style="text-align:center;color:#5A6472;font-size:13.5px;padding:30px 0;">Nenhum atleta cadastrado.</div></div>`;
  const classified = athletes.map(a => ({ a, ...radarClassify(a) })).sort((x, y) => {
    const ord = { RISCO: 0, 'ATENÇÃO': 1, OPORTUNIDADE: 2 };
    return ord[x.category] - ord[y.category];
  });
  const dec = db.all().decisions || {};
  let body = '';
  ['RISCO', 'ATENÇÃO', 'OPORTUNIDADE'].forEach(cat => {
    const list = classified.filter(x => x.category === cat);
    if (!list.length) return;
    const m = RADAR_CAT_META[cat];
    const secIcon = cat === 'OPORTUNIDADE' ? ICONS.check(m.color) : ICONS.warn(m.color);
    body += `<div style="display:flex;align-items:center;gap:6px;margin:16px 4px 10px;">
      ${secIcon}<span style="font-size:11px;font-weight:700;letter-spacing:.1em;color:${m.color};">${cat} · ${list.length}</span></div>`;
    body += list.map(({ a, confidence, sugAction, primarySignal }) => {
      const decided = dec[a.id] ? `<div style="font-size:11px;color:#34E0A1;">✓</div>` : '';
      return `<div class="tap" data-action="radar-open" data-arg="${a.id}" style="background:#0D1015;border:1px solid ${m.bg}.2);border-radius:16px;padding:15px 16px;margin-bottom:9px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
          <div style="position:relative;">${avatar(initialsOf(a.name))}<div style="position:absolute;bottom:-1px;right:-1px;width:12px;height:12px;border-radius:50%;background:${m.color};border:2px solid #0D1015;"></div></div>
          <div style="flex:1;">
            <div style="font-weight:700;font-size:15px;">${esc(a.name)}</div>
            <div style="font-size:12px;color:#8A94A3;">${primarySignal ? esc(primarySignal.text) : 'sem evidência principal'}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;">${decided}<div style="font-size:11px;font-weight:700;color:${RADAR_CONF_COLOR[confidence]};">${confidence}</div><div style="font-size:10px;color:#5A6472;">confiança</div></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(255,255,255,.07);padding-top:10px;">
          <div style="font-size:12.5px;color:#8A94A3;">${primarySignal ? `<span style="color:${m.color};font-weight:700;">${esc(primarySignal.numbers)}</span> · ` : ''}Sugestão: <span style="color:#F4F6F8;font-weight:600;">${sugAction}</span></div>
          <div style="font-size:12px;color:#FF6A3D;font-weight:700;">Ver detalhes →</div>
        </div>
      </div>`;
    }).join('');
  });
  return `<div class="pagepad" style="padding-top:58px;padding-bottom:100px;">
    ${header('Radar de Evidências', 'baseado em evidências · decisão do treinador')}
    <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:13px;padding:11px 14px;margin-bottom:6px;font-size:12.5px;color:#8A94A3;line-height:1.5;">
      O sistema apresenta evidências e sugere uma direção. <span style="color:#F4F6F8;">A decisão final é sempre do treinador.</span>
    </div>
    ${body}
  </div>${tabbar('coachDash', 'TRAINER')}`;
}

export function coachRadarDetail(ctx) {
  const a = db.get('athletes', ctx.athleteId) || db.list('athletes')[0];
  const { category, signals, confidence, sugAction, week, competitiveRisk, missing, dimensions } = radarClassify(a);
  const dec = (db.all().decisions || {})[a.id];
  const m = RADAR_CAT_META[category];
  const c = latestCheckin(a.id);
  const wk = weekLoad(a.id, mondayOf(todayISO()));
  const prevWk = weekLoad(a.id, addDays(mondayOf(todayISO()), -7));
  const nt = nextTournament(a.id);
  const assessments = db.list('assessments', x => x.athleteId === a.id).sort((x, y) => y.date.localeCompare(x.date));

  const evidHtml = signals.length
    ? signals.map(s => {
        const col = s.severity === 'RISCO' ? '#FF5D5D' : s.severity === 'ATENÇÃO' ? '#FFC24B' : '#34E0A1';
        const ico = s.severity === 'OPORTUNIDADE' ? ICONS.check(col) : ICONS.warn(col);
        return `<div style="display:flex;align-items:flex-start;gap:11px;background:${col}10;border:1px solid ${col}28;border-radius:11px;padding:11px 13px;">
          <div style="flex-shrink:0;margin-top:1px;">${ico}</div>
          <div style="flex:1;">
            <div style="font-size:13.5px;font-weight:600;color:#F4F6F8;">${esc(s.text)}</div>
            <div style="font-size:12px;color:#8A94A3;margin-top:2px;">${esc(s.numbers)}</div>
          </div>
          <div style="font-size:10px;font-weight:700;color:${col};background:${col}18;padding:3px 8px;border-radius:6px;flex-shrink:0;">${s.severity}</div>
        </div>`;
      }).join('')
    : `<div style="font-size:13px;color:#5A6472;">Dados insuficientes para gerar evidências.</div>`;

  const histItems = [];
  if (c) histItems.push(`Último check-in: ${fmtShort(c.date)} · prontidão ${c.prontidao != null ? c.prontidao : '—'}/25 · dor ${c.painScore}/10`);
  if (wk) histItems.push(`Carga semana: ${wk.toLocaleString('pt-BR')} UA${prevWk ? ` (ant. ${prevWk.toLocaleString('pt-BR')} UA)` : ''}`);
  if (nt) histItems.push(`Próx. torneio: ${esc(nt.name)} em ${diffDays(nt.startDate, todayISO())} dias`);
  if (assessments[0]) histItems.push(`Última avaliação: ${fmtShort(assessments[0].date)} · índice ${assessments[0].generalIndex}`);
  const histHtml = histItems.length
    ? histItems.map(t => `<div style="font-size:13px;color:#C7CFDA;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);">${t}</div>`).join('')
    : `<div style="font-size:13px;color:#5A6472;">Sem histórico disponível.</div>`;

  const dimensionLabels = { testes: 'Testes físicos', wellness: 'Wellness', carga: 'Carga', contexto: 'Contexto competitivo' };
  const dimensionsHtml = Object.entries(dimensions).map(([key, value]) => `
    <div style="display:grid;grid-template-columns:minmax(108px,.72fr) 1.6fr;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06);min-width:0;">
      <div style="font-size:11.5px;font-weight:700;color:#8A94A3;">${dimensionLabels[key]}</div>
      <div style="font-size:12.5px;color:#C7CFDA;overflow-wrap:anywhere;">${esc(value)}</div>
    </div>`).join('');
  const missingHtml = missing.length ? `<div style="margin-top:10px;font-size:12px;color:#FFC24B;line-height:1.5;overflow-wrap:anywhere;">Para elevar a confiança: ${esc(missing.join(' · '))}.</div>` : '';

  const decBadge = dec
    ? `<div style="background:rgba(52,224,161,.08);border:1px solid rgba(52,224,161,.22);border-radius:13px;padding:13px 16px;margin-bottom:14px;">
        <div style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#34E0A1;margin-bottom:4px;">DECISÃO REGISTRADA ✓</div>
        <div style="font-size:14px;color:#F4F6F8;font-weight:700;">${esc(dec.decision)}</div>
        ${dec.note ? `<div style="font-size:12.5px;color:#8A94A3;margin-top:3px;">${esc(dec.note)}</div>` : ''}
      </div>` : '';

  return `<div class="pagepad" style="padding-top:58px;padding-bottom:80px;overflow-y:auto;-webkit-overflow-scrolling:touch;">
    <div style="position:absolute;inset:0;background:radial-gradient(400px 280px at 50% 10%,${m.bg}.08),transparent 60%);pointer-events:none;"></div>
    <div style="position:relative;">
    ${header(esc(a.name), `Radar · ${m.label}`)}
    <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:18px;">
      <div style="padding:6px 14px;border-radius:999px;background:${m.bg}.15);font-size:12px;font-weight:700;color:${m.color};">${m.label}</div>
      <div style="padding:6px 14px;border-radius:999px;background:${RADAR_CONF_COLOR[confidence]}18;font-size:12px;font-weight:700;color:${RADAR_CONF_COLOR[confidence]};">Confiança ${confidence}</div>
      <div style="padding:6px 14px;border-radius:999px;background:#14181F;font-size:12px;font-weight:700;color:#C7CFDA;">${esc(week.type)} · risco ${esc(competitiveRisk.toLowerCase())}</div>
    </div>
    <div style="background:#0D1015;border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:8px 15px;margin-bottom:14px;">
      <div class="seclabel" style="letter-spacing:.08em;margin:6px 0 2px;">QUATRO DIMENSÕES LIDAS</div>
      ${dimensionsHtml}${missingHtml}
    </div>
    <div style="background:#0D1015;border:1px solid ${m.bg}.22);border-radius:18px;padding:17px;margin-bottom:13px;">
      <div style="padding:8px 15px;border-radius:999px;background:${m.bg}.18);display:inline-flex;margin-bottom:14px;">
        <span style="font-size:13px;font-weight:800;color:${m.color};">SUGESTÃO: ${esc(SUG_LABEL[sugAction] || sugAction)}</span>
      </div>
      <div class="seclabel" style="letter-spacing:.1em;margin-bottom:10px;">EVIDÊNCIAS</div>
      <div style="display:flex;flex-direction:column;gap:8px;">${evidHtml}</div>
    </div>
    <div style="background:#0D1015;border:1px solid rgba(255,255,255,.07);border-radius:18px;padding:16px;margin-bottom:14px;">
      <div class="seclabel" style="letter-spacing:.1em;margin-bottom:8px;">HISTÓRICO RECENTE</div>
      ${histHtml}
    </div>
    ${decBadge}
    <div style="display:flex;gap:11px;">
      <button class="tap btn-primary" data-action="radar-confirm" data-arg="${sugAction}" data-confidence="${confidence}" style="flex:1;">Confirmar decisão</button>
      <button class="tap btn-dark" data-action="radar-alter" style="padding:15px 18px;width:auto;">Alterar</button>
    </div>
    </div>
  </div>`;
}

// ── COPILOTO DE SESSÃO ───────────────────────────────────────────────────────

function mdToHtml(md) {
  if (!md) return '';
  const lines = md.split('\n');
  let html = '';
  let tableOpen = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\|[\s\-:|]+\|/.test(line)) { continue; } // separator row
    if (/^\|.+\|$/.test(line)) {
      const cells = line.slice(1, -1).split('|').map(c => c.trim());
      const isFirst = !tableOpen;
      if (!tableOpen) { html += `<div style="margin:8px 0;border:1px solid rgba(255,255,255,.07);border-radius:8px;overflow:hidden;">`; tableOpen = true; }
      html += `<div style="display:flex;gap:0;border-bottom:1px solid rgba(255,255,255,.06);${isFirst?'background:#14181F;':''}">` +
        cells.map((c, ci) => `<div style="flex:${ci===0?'0 0 42%':'1'};padding:7px 10px;font-size:12px;color:${isFirst?'#8A94A3':'#C7CFDA'};font-weight:${isFirst?'700':'400'};word-break:break-word;">${esc(c)}</div>`).join('') + '</div>';
      continue;
    }
    if (tableOpen && !/^\|/.test(line)) { html += '</div>'; tableOpen = false; }
    const txt = line.trim();
    if (!txt) { html += '<div style="height:5px;"></div>'; continue; }
    if (line.startsWith('# ')) {
      html += `<div style="font-family:'Space Grotesk';font-weight:700;font-size:16px;color:#F4F6F8;margin:14px 0 6px;">${esc(line.slice(2))}</div>`;
    } else if (line.startsWith('## ')) {
      html += `<div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:#FF6A3D;margin:12px 0 5px;">${esc(line.slice(3)).toUpperCase()}</div>`;
    } else if (line.startsWith('### ')) {
      html += `<div style="font-size:13px;font-weight:700;color:#C7CFDA;margin:9px 0 4px;">${esc(line.slice(4))}</div>`;
    } else if (/^---+$/.test(txt)) {
      html += `<div style="border-top:1px solid rgba(255,255,255,.08);margin:12px 0;"></div>`;
    } else if (line.startsWith('- ')) {
      const content = esc(line.slice(2)).replace(/\*\*(.+?)\*\*/g, '<strong style="color:#F4F6F8;">$1</strong>');
      html += `<div style="display:flex;gap:8px;padding:2px 0;"><span style="color:#FF6A3D;flex-shrink:0;">·</span><span style="font-size:13px;color:#C7CFDA;line-height:1.5;">${content}</span></div>`;
    } else if (/^\*[^*].*[^*]\*$/.test(txt)) {
      html += `<div style="font-size:12.5px;color:#8A94A3;font-style:italic;margin-top:10px;line-height:1.55;text-align:center;">${esc(txt.slice(1,-1))}</div>`;
    } else {
      const content = esc(line).replace(/\*\*(.+?)\*\*/g, '<span style="font-weight:700;color:#F4F6F8;">$1</span>');
      html += `<div style="font-size:13px;color:#C7CFDA;line-height:1.6;padding:1px 0;">${content}</div>`;
    }
  }
  if (tableOpen) html += '</div>';
  return html;
}

export function coachCopiloto(ctx) {
  const athletes = db.list('athletes');
  const aId = ctx.copilotoAthleteId || ctx.athleteId || (athletes[0] || {}).id;
  const a = aId ? (db.get('athletes', aId) || athletes[0]) : athletes[0];

  const c = a ? latestCheckin(a.id) : null;
  const nt = a ? nextTournament(a.id) : null;
  const assess = a ? db.list('assessments', x => x.athleteId === a.id).sort((x, y) => y.date.localeCompare(x.date))[0] : null;
  const recentSes = a ? db.list('sessions', s => s.athleteId === a.id).sort((x, y) => y.date.localeCompare(x.date))[0] : null;

  let prontidaoVal = '—', prontidaoBanda = '—', prontidaoColor = '#8A94A3';
  if (c && c.prontidao != null) {
    prontidaoVal = c.prontidao;
    if (c.prontidao >= 18) { prontidaoBanda = 'VERDE'; prontidaoColor = '#34E0A1'; }
    else if (c.prontidao >= 15) { prontidaoBanda = 'AMARELO'; prontidaoColor = '#FFC24B'; }
    else { prontidaoBanda = 'VERMELHO'; prontidaoColor = '#FF5D5D'; }
  }

  const torneioLabel = nt ? `${esc(nt.name)} · ${diffDays(nt.startDate, todayISO())} dias` : 'Nenhum cadastrado';
  const SINAIS_BLOQUEIO = ['dor','machucou','lesionou','travou','fisioterapeuta','médico','cirurgia','inflama','inchou','não aguenta','ruptura','fratura'];
  const contextText = ctx.copilotoContext || '';
  const sinaisEncontrados = SINAIS_BLOQUEIO.filter(s => contextText.toLowerCase().includes(s));
  const hasBlock = sinaisEncontrados.length > 0;

  const isLoading = !!ctx.copilotoLoading;
  const result = ctx.copilotoResult || '';
  const isApproved = !!ctx.copilotoApproved;

  const athOptions = athletes.map(x => `<option value="${x.id}" ${x.id === aId ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
  const daysTo = nt ? diffDays(nt.startDate, todayISO()) : null;

  return `<div class="pagepad" style="padding-top:58px;padding-bottom:120px;">
    <div style="display:flex;align-items:center;gap:13px;margin-bottom:20px;">
      <div class="tap backbtn" data-action="back">${ICONS.back}</div>
      <div>
        <div style="font-size:11px;font-weight:700;letter-spacing:.14em;color:#FF6A3D;">COPILOTO DE SESSÃO</div>
        <div style="font-family:'Space Grotesk';font-weight:700;font-size:20px;">Prescrição assistida por IA</div>
      </div>
    </div>

    <div class="card" style="padding:14px 16px;margin-bottom:12px;">
      <div class="seclabel" style="letter-spacing:.1em;margin-bottom:8px;">ATLETA</div>
      <select id="copiloto-athlete" style="background:#0D1015;border:none;border-radius:8px;font-size:14px;color:#F4F6F8;padding:8px 10px;width:100%;-webkit-appearance:none;outline:none;">${athOptions}</select>
    </div>

    <div class="card" style="padding:14px 16px;margin-bottom:12px;">
      <div class="seclabel" style="letter-spacing:.1em;margin-bottom:10px;">ESTADO ATUAL</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div style="background:#0D1015;border-radius:10px;padding:10px 12px;">
          <div style="font-size:10px;color:#5A6472;letter-spacing:.08em;font-weight:700;margin-bottom:4px;">PRONTIDÃO</div>
          <div style="font-family:'Space Grotesk';font-weight:700;font-size:22px;color:${prontidaoColor};">${prontidaoVal}<span style="font-size:11px;color:#5A6472;">/25</span></div>
          <div style="font-size:11px;color:${prontidaoColor};margin-top:2px;">${prontidaoBanda}</div>
        </div>
        <div style="background:#0D1015;border-radius:10px;padding:10px 12px;">
          <div style="font-size:10px;color:#5A6472;letter-spacing:.08em;font-weight:700;margin-bottom:4px;">DOR</div>
          <div style="font-family:'Space Grotesk';font-weight:700;font-size:22px;color:${c && c.painScore > 0 ? (c.painScore >= 6 ? '#FF5D5D' : '#FFC24B') : '#34E0A1'};">${c && c.painScore > 0 ? c.painScore : '0'}<span style="font-size:11px;color:#5A6472;">/10</span></div>
          <div style="font-size:11px;color:#8A94A3;margin-top:2px;">${c && c.painScore > 0 ? esc(c.painLocation || 'região?') : 'sem dor'}</div>
        </div>
      </div>
      <div style="background:#0D1015;border-radius:10px;padding:10px 12px;">
        <div style="font-size:10px;color:#5A6472;letter-spacing:.08em;font-weight:700;margin-bottom:4px;">CALENDÁRIO · AVALIAÇÃO</div>
        <div style="font-size:13px;font-weight:600;">${torneioLabel}${daysTo !== null && daysTo <= 1 ? ' <span style="color:#FF5D5D;font-size:11px;">⚠ COMPETIÇÃO</span>' : daysTo !== null && daysTo <= 3 ? ' <span style="color:#FFC24B;font-size:11px;">⚠ pré-torneio</span>' : ''}</div>
        ${recentSes ? `<div style="font-size:11px;color:#8A94A3;margin-top:4px;">Última sessão: ${esc(recentSes.title)} · ${diffDays(todayISO(), recentSes.date)} dias</div>` : '<div style="font-size:11px;color:#5A6472;margin-top:4px;">Sem sessões registradas</div>'}
        ${assess ? `<div style="font-size:11px;color:#8A94A3;margin-top:3px;">Avaliação: CMJ ${assess.cmj}cm · SJ ${assess.sj}cm · Sprint 5m ${assess.sprint5m}s · Assim. MB ${assess.mbAsym}%</div>` : ''}
      </div>
    </div>

    <div class="card" style="padding:14px 16px;margin-bottom:${hasBlock ? '8px' : '12px'};">
      <div class="seclabel" style="letter-spacing:.1em;margin-bottom:8px;">CONTEXTO ADICIONAL <span style="font-weight:400;color:#5A6472;font-size:10px;">opcional</span></div>
      <textarea id="copiloto-context" placeholder="Ex: atleta viajou ontem, chegou bem. Treinou quadra 2h de manhã. Sem dor hoje." rows="3" style="width:100%;background:#0D1015;border:1.5px solid rgba(255,255,255,.07);border-radius:10px;padding:10px 12px;color:#F4F6F8;font-family:'Manrope';font-size:13px;resize:none;outline:none;box-sizing:border-box;">${esc(contextText)}</textarea>
    </div>

    <div id="copiloto-block-warn" style="display:${hasBlock?'flex':'none'};align-items:flex-start;gap:10px;background:rgba(255,93,93,.08);border:1px solid rgba(255,93,93,.3);border-radius:12px;padding:12px 14px;margin-bottom:12px;">
      ${ICONS.warn('#FF5D5D')}
      <div>
        <div style="font-size:13px;font-weight:700;color:#FF5D5D;">Sinal de bloqueio detectado</div>
        <div id="copiloto-block-terms" style="font-size:12px;color:#C7CFDA;margin-top:3px;">${hasBlock ? 'Termos: ' + sinaisEncontrados.map(s=>`"${s}"`).join(', ') + ' → apenas A5, A6A ou B7.' : ''}</div>
      </div>
    </div>

    ${isLoading ? `
    <div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:36px 0;">
      <div style="width:44px;height:44px;border-radius:50%;border:3px solid rgba(255,106,61,.15);border-top-color:#FF6A3D;animation:spin 0.9s linear infinite;"></div>
      <div style="font-size:13.5px;color:#8A94A3;">Analisando dados e gerando sessão…</div>
      <div style="font-size:12px;color:#5A6472;">Motor BT aplicando árvore de decisão</div>
    </div>
    ` : `
    <button class="tap btn-primary" data-action="copiloto-generate" style="box-shadow:0 12px 30px -8px rgba(255,106,61,.45);margin-bottom:10px;">
      ${result ? '↺ Gerar nova sessão' : 'Gerar sessão →'}
    </button>
    <button class="tap btn-dark" data-action="microciclo-generate" style="${result ? 'margin-bottom:20px;' : 'margin-bottom:20px;'}">
      📅 Montar microciclo da semana com IA
    </button>
    `}

    ${result && !isLoading ? `
    <div style="background:#0D1015;border:1px solid rgba(255,106,61,.18);border-radius:18px;padding:18px;margin-bottom:14px;">
      <div class="seclabel" style="letter-spacing:.1em;margin-bottom:12px;">SESSÃO GERADA</div>
      <div style="font-size:13.5px;color:#C7CFDA;line-height:1.65;">${mdToHtml(result)}</div>
    </div>
    ${!isApproved ? `
    <div style="display:flex;gap:11px;margin-bottom:10px;">
      <button class="tap btn-primary" data-action="copiloto-approve" style="flex:1;padding:15px;">Aprovar e salvar ✓</button>
      <button class="tap btn-dark" data-action="copiloto-adjust" style="padding:15px 18px;width:auto;">Ajustar</button>
      <button class="tap btn-dark" data-action="copiloto-reject" style="padding:15px 18px;width:auto;">Rejeitar ✗</button>
    </div>
    <div style="text-align:center;font-size:11.5px;color:#5A6472;line-height:1.5;margin-bottom:6px;">Esta sessão só vai ao atleta depois que você aprovar</div>
    ` : `
    <div style="display:flex;align-items:center;gap:10px;background:rgba(52,224,161,.08);border:1px solid rgba(52,224,161,.25);border-radius:13px;padding:14px;margin-bottom:10px;">
      ${ICONS.check('#34E0A1')}
      <div>
        <div style="font-size:14px;font-weight:700;color:#34E0A1;">Aprovada e salva no plano ✓</div>
        <div style="font-size:12px;color:#8A94A3;margin-top:2px;">Visível para o atleta em Treino</div>
      </div>
    </div>
    `}
    ` : ''}
  </div>`;
}

// ── MICROCICLO (semana inteira via Copiloto) ────────────────────────────────
export function coachMicrociclo(ctx) {
  const a = db.get('athletes', ctx.microcicloAthleteId) || db.list('athletes')[0];
  const results = ctx.microcicloResults || [];
  const total = ctx.microcicloTotalDays || results.length || 1;
  const isLoading = !!ctx.microcicloLoading;
  const pendingApprovable = results.filter(r => r.validation && r.validation.ok && !r.approved).length;

  return `<div class="pagepad" style="padding-top:58px;padding-bottom:120px;">
    <div style="display:flex;align-items:center;gap:13px;margin-bottom:20px;">
      <div class="tap backbtn" data-action="back">${ICONS.back}</div>
      <div>
        <div style="font-size:11px;font-weight:700;letter-spacing:.14em;color:#FF6A3D;">MICROCICLO DA SEMANA</div>
        <div style="font-family:'Space Grotesk';font-weight:700;font-size:20px;">${a ? esc(a.name) : 'Atleta'}</div>
      </div>
    </div>

    ${isLoading ? `
    <div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:24px 0 30px;">
      <div style="width:44px;height:44px;border-radius:50%;border:3px solid rgba(255,106,61,.15);border-top-color:#FF6A3D;animation:spin 0.9s linear infinite;"></div>
      <div style="font-size:13.5px;color:#8A94A3;">Gerando sessão ${Math.min(results.length + 1, total)} de ${total}…</div>
      <div style="font-size:12px;color:#5A6472;">Cada dia usa o mesmo motor da sessão única, considerando o que já foi gerado antes nesta semana</div>
    </div>
    ` : ''}

    ${!isLoading && pendingApprovable > 1 ? `
    <button class="tap btn-primary" data-action="microciclo-approve-all" style="margin-bottom:16px;box-shadow:0 12px 30px -8px rgba(255,106,61,.45);">Aprovar todas (${pendingApprovable}) ✓</button>
    ` : ''}

    ${results.map((day, i) => {
      const dow = fmtDow(day.date);
      if (!day.validation || !day.validation.ok) {
        return `<div class="card" style="padding:14px 16px;margin-bottom:12px;border:1px solid rgba(255,93,93,.3);">
          <div style="font-size:12px;color:#5A6472;margin-bottom:4px;">${dow} · ${day.date}</div>
          <div style="font-size:13.5px;color:#FF9B9B;">⚠ ${esc((day.validation && day.validation.error) || 'Falha ao gerar')}</div>
          <div class="tap" data-action="microciclo-day-reject" data-arg="${i}" style="margin-top:10px;font-size:12.5px;color:#8A94A3;">Remover da lista</div>
        </div>`;
      }
      return `<div class="card" style="padding:14px 16px;margin-bottom:12px;border:1px solid ${day.approved ? 'rgba(52,224,161,.3)' : 'rgba(255,106,61,.18)'};">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div style="font-size:12px;color:#5A6472;">${dow} · ${day.date} · ${esc(day.validation.code)}</div>
          ${day.approved ? `<span style="font-size:11px;font-weight:700;color:#34E0A1;">APROVADA ✓</span>` : ''}
        </div>
        <div style="font-size:13px;color:#C7CFDA;line-height:1.6;max-height:260px;overflow-y:auto;">${mdToHtml(day.result)}</div>
        ${!day.approved ? `
        <div style="display:flex;gap:10px;margin-top:12px;">
          <button class="tap btn-primary" data-action="microciclo-day-approve" data-arg="${i}" style="flex:1;padding:12px;">Aprovar ✓</button>
          <button class="tap btn-dark" data-action="microciclo-day-reject" data-arg="${i}" style="padding:12px 16px;width:auto;">Rejeitar ✗</button>
        </div>` : ''}
      </div>`;
    }).join('')}

    ${!isLoading && !results.length ? `<div style="text-align:center;color:#5A6472;font-size:13.5px;padding:30px 0;">Nenhuma sessão gerada ainda.</div>` : ''}
  </div>`;
}

// ── CONFIGURAÇÕES ───────────────────────────────────────────────────────────
export function coachSettings() {
  const me = auth.current();
  const push = db.all().settings.pushEnabled;
  return `<div class="pagepad">
    <div style="font-family:'Space Grotesk';font-weight:700;font-size:24px;margin-bottom:18px;">Configurações</div>
    <div class="card" style="display:flex;align-items:center;gap:14px;border-radius:16px;padding:16px;margin-bottom:18px;">
      ${avatar(me.avatarInitials, 50, 'linear-gradient(135deg,#FF6A3D,#FF9A3D)', '#0B0E12', '15px')}
      <div style="flex:1;"><div style="font-weight:700;font-size:16px;">${esc(me.name)}</div><div style="font-size:12.5px;color:#8A94A3;">Preparador físico · Equipe Brasil</div></div>${ICONS.chev}</div>
    <div class="seclabel" style="margin:0 4px 12px;">DISPOSITIVOS CONECTADOS</div>
    <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:18px;">
      ${[['WHOOP 4.0', '#34E0A1', '8 atletas'], ['Garmin Connect', '#5B9DFF', '5 atletas'], ['Oura Ring', '#FFC24B', 'conectar']].map(([name, color, tag]) => `
      <div class="tap card" data-action="future" data-arg="Integração com ${name}" style="display:flex;align-items:center;gap:13px;padding:14px 15px;">
        <div style="width:36px;height:36px;border-radius:10px;background:#1C232C;display:flex;align-items:center;justify-content:center;"><div style="width:14px;height:14px;border-radius:${name.includes('WHOOP') ? '4px' : '50%'};background:${tag === 'conectar' ? 'transparent' : color};${tag === 'conectar' ? `border:3px solid ${color};` : ''}"></div></div>
        <div style="flex:1;font-size:14.5px;font-weight:600;">${name}</div>
        <span style="font-size:12px;color:${tag === 'conectar' ? '#5A6472' : '#34E0A1'};${tag !== 'conectar' ? 'background:rgba(52,224,161,.12);padding:5px 10px;border-radius:7px;' : ''}">${tag} <span style="color:#5A6472;font-size:10px;">(mock)</span></span></div>`).join('')}
    </div>
    <div class="seclabel" style="margin:0 4px 12px;">PREFERÊNCIAS</div>
    <div class="card" style="display:flex;flex-direction:column;gap:1px;border-radius:14px;overflow:hidden;">
      <div class="tap" data-action="settings-push" style="display:flex;align-items:center;justify-content:space-between;padding:15px;"><span style="font-size:14.5px;">Notificações push</span>
        <div style="width:44px;height:26px;border-radius:13px;background:${push ? '#FF6A3D' : '#2A323D'};position:relative;transition:background .15s;"><div style="position:absolute;top:3px;${push ? 'right:3px' : 'left:3px'};width:20px;height:20px;border-radius:50%;background:#fff;"></div></div></div>
      <div style="height:1px;background:rgba(255,255,255,.05);"></div>
      <div class="tap" data-action="future" data-arg="Troca de unidades" style="display:flex;align-items:center;justify-content:space-between;padding:15px;"><span style="font-size:14.5px;">Unidades · métrico</span>${ICONS.chev}</div>
      <div style="height:1px;background:rgba(255,255,255,.05);"></div>
      <div class="tap" data-action="logout" style="display:flex;align-items:center;justify-content:space-between;padding:15px;"><span style="font-size:14.5px;color:#FF5D5D;">Sair da conta</span></div>
    </div>
  </div>${tabbar('coachSettings', 'TRAINER')}`;
}
