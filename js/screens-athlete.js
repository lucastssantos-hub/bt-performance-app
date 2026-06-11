// screens-athlete.js — telas do atleta (login João), renderizadas a partir do db
import { db, auth, latestCheckin, nextTournament, streakDays, sessionLoad, weekLoad, mondayOf, todayISO, addDays, diffDays, STATUS_META, athleteStatus, recoveryOf } from './db.js';
import { esc, ring, avatar, initialsOf, fmtShort, fmtDow, fmtDayNum, fmtTimeAgo, fmtHoursMin } from './ui.js';
import { tabbar, header, ICONS } from './screens-coach.js';

const myAthlete = () => { const u = auth.current(); return db.get('athletes', u.athleteId) || db.list('athletes')[0]; };
// prioridade: em curso > planejada > concluída; empate: mais exercícios primeiro
export const todaySession = (athleteId) => {
  const rank = { IN_PROGRESS: 0, PLANNED: 1, COMPLETED: 2, SKIPPED: 3 };
  return db.list('sessions', s => s.athleteId === athleteId && s.date === todayISO())
    .sort((a, b) => (rank[a.status] - rank[b.status]) || ((b.exercises || []).length - (a.exercises || []).length))[0] || null;
};

// ── HOME ─────────────────────────────────────────────────────────────────────
export function athleteHome() {
  const u = auth.current(), a = myAthlete();
  const c = latestCheckin(a.id);
  const hasToday = c && c.date === todayISO();
  const r = c ? c.readinessScore : 0;
  const color = r >= 80 ? '#34E0A1' : r >= 65 ? '#FFC24B' : '#FF5D5D';
  const sess = todaySession(a.id);
  const nt = nextTournament(a.id);
  const lastMsg = db.list('messages', m => m.receiverId === u.id || m.senderId === u.id).sort((x, y) => y.createdAt - x.createdAt)[0];
  const coach = db.list('users', x => x.role === 'TRAINER')[0];
  const unreadMsg = db.list('messages', m => m.receiverId === u.id && !m.read).length;
  const dows = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return `<div class="pagepad" style="padding-top:58px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <div><div style="font-size:13px;color:#8A94A3;">${dows[new Date().getDay()]}, ${fmtShort(todayISO())}</div>
      <div style="font-family:'Space Grotesk';font-weight:700;font-size:22px;">Olá, ${esc(a.name.split(' ')[0])}</div></div>
      <div class="tap" data-action="tab" data-screen="athleteProfile" style="position:relative;">${avatar(initialsOf(a.name), 44)}${unreadMsg ? '<div style="position:absolute;top:-2px;right:-2px;width:11px;height:11px;border-radius:50%;background:#FF6A3D;border:2px solid #0B0E12;"></div>' : ''}</div></div>
    <div class="tap" data-action="go" data-screen="athleteWellness" style="background:linear-gradient(150deg,${hasToday ? '#0F2018' : '#1A1410'},#0D1015);border:1px solid ${hasToday ? 'rgba(52,224,161,.25)' : 'rgba(255,106,61,.3)'};border-radius:22px;padding:20px;margin-bottom:14px;display:flex;align-items:center;gap:18px;">
      ${hasToday ? ring(r, color, 84, 66, 27, 'RECOVERY') : `<div style="width:84px;height:84px;border-radius:50%;background:conic-gradient(#FF6A3D 0 25%,#1C232C 0);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><div style="width:66px;height:66px;border-radius:50%;background:#0D1015;display:flex;flex-direction:column;align-items:center;justify-content:center;"><span style="font-family:'Space Grotesk';font-weight:700;font-size:27px;color:#FF6A3D;">?</span><span style="font-size:9px;color:#5A6472;letter-spacing:.1em;">CHECK-IN</span></div></div>`}
      <div style="flex:1;"><div style="font-family:'Space Grotesk';font-weight:700;font-size:20px;line-height:1.1;">${hasToday ? (r >= 80 ? 'Você está pronto' : r >= 65 ? 'Atenção hoje' : 'Corpo pedindo leve') : 'Faça o check-in'}</div>
      <div style="font-size:13px;color:#C7CFDA;margin-top:6px;line-height:1.4;">${hasToday ? 'Check-in de hoje enviado. Toque para revisar.' : '30 segundos · calibra seu treino de hoje.'}</div></div></div>
    ${sess ? `<div style="background:#0D1015;border:1px solid rgba(255,106,61,.2);border-radius:20px;padding:18px;margin-bottom:14px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;"><div style="font-size:11px;font-weight:700;letter-spacing:.12em;color:#FF6A3D;">TREINO DE HOJE</div><span style="font-size:12px;color:#8A94A3;">${sess.durationMinutes} min · ${sess.location === 'GYM' ? 'academia' : sess.location === 'SAND' ? 'areia' : 'recovery'}</span></div>
      <div style="display:flex;align-items:center;gap:14px;"><div style="width:46px;height:46px;border-radius:13px;background:rgba(255,106,61,.13);display:flex;align-items:center;justify-content:center;">${ICONS.barbell('#FF6A3D')}</div>
      <div style="flex:1;"><div style="font-weight:700;font-size:16px;">${esc(sess.title)}</div>
      <div style="font-size:12.5px;color:#8A94A3;">${sess.exercises.length ? sess.exercises.length + ' exercícios · ' : ''}RPE alvo ${sess.targetRpe}${sess.status === 'COMPLETED' ? ' · concluído ✓' : sess.status === 'IN_PROGRESS' ? ' · em curso' : ''}</div></div></div>
      <button class="tap btn-primary" data-action="${sess.status === 'COMPLETED' ? 'tab' : 'workout-start'}" data-screen="athleteWorkout" data-arg="${sess.id}" style="padding:14px;margin-top:14px;border-radius:13px;${sess.status === 'COMPLETED' ? 'background:#1C232C;color:#F4F6F8;' : ''}">${sess.status === 'COMPLETED' ? 'Ver treino concluído' : sess.status === 'IN_PROGRESS' ? 'Continuar treino' : 'Iniciar treino'}</button></div>`
      : `<div class="card" style="border-radius:20px;padding:18px;margin-bottom:14px;text-align:center;color:#8A94A3;font-size:13.5px;">Sem treino programado para hoje. Dia de descanso 😴</div>`}
    <div style="display:flex;gap:12px;margin-bottom:14px;">
      <div class="tap card" data-action="go" data-screen="athleteTournament" style="flex:1;border-radius:16px;padding:15px;"><div class="seclabel" style="letter-spacing:.1em;">PRÓXIMO TORNEIO</div>
        <div style="font-family:'Space Grotesk';font-weight:700;font-size:17px;margin-top:6px;">${nt ? esc(nt.name) : '—'}</div>
        <div style="font-size:12px;color:#5B9DFF;margin-top:2px;">${nt ? `em ${diffDays(nt.startDate, todayISO())} dias` : 'nada agendado'}</div></div>
      <div class="tap card" data-action="tab" data-screen="athleteRecovery" style="flex:1;border-radius:16px;padding:15px;"><div class="seclabel" style="letter-spacing:.1em;">SONO</div>
        <div style="font-family:'Space Grotesk';font-weight:700;font-size:17px;margin-top:6px;">${c ? fmtHoursMin(c.sleepHours) : '—'}</div>
        <div style="font-size:12px;color:${c && c.sleepHours >= 7 ? '#34E0A1' : '#FFC24B'};margin-top:2px;">${c ? (c.sleepHours >= 7 ? 'ótimo' : 'abaixo do ideal') : 'sem registro'}</div></div></div>
    ${lastMsg ? `<div class="tap card" data-action="tab" data-screen="athleteMessages" style="display:flex;align-items:center;gap:13px;border-radius:16px;padding:14px 15px;">
      ${avatar(coach.avatarInitials, 40, 'linear-gradient(135deg,#FF6A3D,#FF9A3D)', '#0B0E12')}
      <div style="flex:1;"><div style="font-size:13px;font-weight:700;">${esc(coach.name.split(' ')[0])} · Treinador</div>
      <div style="font-size:12.5px;color:#8A94A3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;">"${esc(lastMsg.content)}"</div></div>
      ${unreadMsg ? '<div style="width:9px;height:9px;border-radius:50%;background:#FF6A3D;"></div>' : ''}</div>` : ''}
  </div>${tabbar('athleteHome', 'ATHLETE')}`;
}

// ── CHECK-IN ─────────────────────────────────────────────────────────────────
export function athleteWellness(ctx) {
  const a = myAthlete();
  const existing = latestCheckin(a.id);
  const base = (existing && existing.date === todayISO()) ? existing : { sleepQuality: 3, sleepHours: 7, energy: 3, musclePain: 1, stress: 1, humor: 3, painLocation: '', painScore: 0, alteraMovimento: false, emImpacto: false };
  if (base.humor == null) base.humor = 3;
  if (!ctx.checkin) ctx.checkin = { ...base };
  const ck = ctx.checkin;
  const scaleRow = (label, key, value, labels, invert) => {
    const idx = value - 1;
    const good = invert ? value <= 2 : value >= 4;
    const color = good ? '#34E0A1' : (invert ? value >= 4 : value <= 2) ? '#FF5D5D' : '#FFC24B';
    return `<div><div style="display:flex;justify-content:space-between;margin-bottom:11px;">
      <span style="font-size:14.5px;font-weight:600;">${label}</span><span style="font-size:13px;color:${color};font-weight:700;">${labels[idx]}</span></div>
      <div style="display:flex;gap:8px;">${[1, 2, 3, 4, 5].map(v => `<div class="tap" data-action="checkin-set" data-key="${key}" data-arg="${v}" style="flex:1;height:38px;border-radius:10px;background:${v === value ? color : '#1C232C'};${v === value ? '' : 'border:1px solid rgba(255,255,255,.04);'}"></div>`).join('')}</div></div>`;
  };
  return `<div class="pagepad" style="padding-top:58px;padding-bottom:30px;">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;"><div class="tap backbtn" data-action="back">${ICONS.back}</div>
      <div style="font-size:13px;color:#34E0A1;font-weight:700;letter-spacing:.1em;">CHECK-IN DA MANHÃ</div></div>
    <div style="font-family:'Space Grotesk';font-weight:700;font-size:23px;margin-bottom:6px;">Como você acordou?</div>
    <div style="font-size:13px;color:#8A94A3;margin-bottom:22px;">30 segundos · ajuda a calibrar seu treino.</div>
    <div style="display:flex;flex-direction:column;gap:20px;">
      ${scaleRow('Qualidade do sono', 'sleepQuality', ck.sleepQuality, ['Péssima', 'Ruim', 'Ok', 'Boa', 'Ótima'], false)}
      <div><div style="display:flex;justify-content:space-between;margin-bottom:11px;"><span style="font-size:14.5px;font-weight:600;">Horas de sono</span><span style="font-size:13px;color:#34E0A1;font-weight:700;">${Number(ck.sleepHours).toFixed(1)}h</span></div>
        <input id="ck-hours" type="range" min="3" max="11" step="0.5" value="${ck.sleepHours}" style="width:100%;accent-color:#FF6A3D;"></div>
      ${scaleRow('Energia', 'energy', ck.energy, ['Esgotado', 'Baixa', 'Normal', 'Alta', 'Máxima'], false)}
      ${scaleRow('Dor muscular', 'musclePain', ck.musclePain, ['Nenhuma', 'Leve', 'Moderada', 'Forte', 'Intensa'], true)}
      ${scaleRow('Estresse', 'stress', ck.stress, ['Baixo', 'Leve', 'Médio', 'Alto', 'Crítico'], true)}
      ${scaleRow('Humor', 'humor', ck.humor, ['Péssimo', 'Baixo', 'Neutro', 'Bom', 'Ótimo'], false)}
      <div><div style="display:flex;justify-content:space-between;margin-bottom:11px;"><span style="font-size:14.5px;font-weight:600;">Dor localizada</span><span style="font-size:13px;color:${ck.painScore >= 7 ? '#FF5D5D' : ck.painScore > 0 ? '#FFC24B' : '#34E0A1'};font-weight:700;">${ck.painScore > 0 ? ck.painScore + '/10' : 'sem dor'}</span></div>
        <div style="display:flex;gap:8px;">
          <input id="ck-painloc" placeholder="região (ex: lombar)" value="${esc(ck.painLocation)}" style="flex:1.4;background:#14181F;border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:10px 12px;color:#F4F6F8;font-family:'Manrope';font-size:13px;outline:none;">
          <input id="ck-painscore" type="number" min="0" max="10" value="${ck.painScore}" style="flex:.6;background:#14181F;border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:10px 12px;color:#F4F6F8;font-family:'Manrope';font-size:13px;outline:none;"></div>
        <div style="display:flex;gap:16px;margin-top:10px;">
          <label style="display:flex;align-items:center;gap:7px;font-size:12.5px;color:#C7CFDA;"><input id="ck-altera" type="checkbox" ${ck.alteraMovimento ? 'checked' : ''} style="accent-color:#FF6A3D;">Altera o movimento</label>
          <label style="display:flex;align-items:center;gap:7px;font-size:12.5px;color:#C7CFDA;"><input id="ck-impacto" type="checkbox" ${ck.emImpacto ? 'checked' : ''} style="accent-color:#FF6A3D;">Dói no impacto</label></div></div>
    </div>
    <button class="tap btn-primary" data-action="checkin-save" style="margin-top:26px;box-shadow:0 12px 30px -8px rgba(255,106,61,.5);">Enviar check-in</button>
  </div>`;
}

// ── TREINO ───────────────────────────────────────────────────────────────────
export function athleteWorkout(ctx) {
  const a = myAthlete();
  const sess = (ctx.sessionId && db.get('sessions', ctx.sessionId)) || todaySession(a.id);
  if (!sess) return `<div class="pagepad" style="padding-top:58px;">${header('Treino', 'hoje')}<div style="text-align:center;color:#5A6472;font-size:13.5px;padding:30px 0;">Sem treino programado para hoje.</div></div>${tabbar('athleteWorkout', 'ATHLETE')}`;
  ctx.sessionId = sess.id;
  const done = sess.exercises.filter(e => e.status === 'DONE').length;
  const total = sess.exercises.length;
  const allDone = total > 0 && done === total;
  const rows = sess.exercises.sort((x, y) => x.order - y.order).map((e, i) => {
    const isDone = e.status === 'DONE';
    const isCurrent = !isDone && sess.exercises.filter(x => x.order < e.order && x.status !== 'DONE').length === 0 && sess.status === 'IN_PROGRESS';
    return `<div class="tap" data-action="exercise-toggle" data-arg="${e.id}" style="display:flex;align-items:center;gap:13px;background:#0D1015;border:1px solid ${isCurrent ? 'rgba(255,106,61,.2)' : 'rgba(255,255,255,.06)'};border-radius:14px;padding:14px 15px;">
      <div style="width:30px;height:30px;border-radius:9px;background:${isDone ? 'rgba(52,224,161,.13)' : isCurrent ? '#FF6A3D' : '#1C232C'};display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk';font-weight:700;font-size:13px;color:${isCurrent ? '#0B0E12' : '#F4F6F8'};">
        ${isDone ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34E0A1" stroke-width="2.6"><path d="M5 12l5 5L20 7"/></svg>' : i}</div>
      <div style="flex:1;"><div style="font-size:14.5px;font-weight:700;${isDone ? 'color:#8A94A3;text-decoration:line-through;' : ''}">${esc(e.name)}</div>
      <div style="font-size:12px;color:#8A94A3;">${e.sets} × ${esc(String(e.reps))}${e.intensity && e.intensity !== '—' ? ' · ' + esc(e.intensity) : ''}</div></div>
      ${isCurrent ? '<span style="font-size:12px;color:#FF6A3D;font-weight:700;">em curso</span>' : ''}</div>`;
  }).join('');
  let cta;
  if (sess.status === 'COMPLETED') cta = `<div style="text-align:center;color:#34E0A1;font-weight:700;font-size:14.5px;padding:16px;background:rgba(52,224,161,.1);border-radius:14px;margin-top:16px;">Treino concluído ✓ · RPE final ${sess.rpeFinal} · ${sessionLoad(sess)} UA</div>`;
  else if (sess.status === 'PLANNED') cta = `<button class="tap btn-primary" data-action="workout-start" data-arg="${sess.id}" style="margin-top:16px;box-shadow:0 12px 30px -8px rgba(255,106,61,.5);">Iniciar treino</button>`;
  else if (allDone || total === 0) cta = `<button class="tap btn-primary" data-action="workout-finish" data-arg="${sess.id}" style="margin-top:16px;box-shadow:0 12px 30px -8px rgba(255,106,61,.5);">Finalizar treino · registrar RPE</button>`;
  else cta = `<button class="tap btn-primary" data-action="workout-continue" data-arg="${sess.id}" style="margin-top:16px;box-shadow:0 12px 30px -8px rgba(255,106,61,.5);">Concluir exercício ${done} de ${total}</button>`;
  return `<div class="pagepad" style="padding-top:58px;padding-bottom:110px;">
    <div style="display:flex;align-items:center;gap:13px;margin-bottom:16px;"><div class="tap backbtn" data-action="tab" data-screen="athleteHome">${ICONS.back}</div>
      <div><div style="font-family:'Space Grotesk';font-weight:700;font-size:19px;">${esc(sess.title)}</div>
      <div style="font-size:12.5px;color:#8A94A3;">${total ? total + ' exercícios · ' : ''}~${sess.durationMinutes} min · RPE alvo ${sess.targetRpe}</div></div></div>
    <div style="display:flex;gap:10px;margin-bottom:18px;">
      <div class="card" style="flex:1;border-radius:13px;padding:12px;text-align:center;"><div style="font-family:'Space Grotesk';font-weight:700;font-size:18px;">${total || '—'}</div><div style="font-size:11px;color:#8A94A3;">exercícios</div></div>
      <div class="card" style="flex:1;border-radius:13px;padding:12px;text-align:center;"><div style="font-family:'Space Grotesk';font-weight:700;font-size:18px;">${done}</div><div style="font-size:11px;color:#8A94A3;">concluídos</div></div>
      <div class="card" style="flex:1;border-radius:13px;padding:12px;text-align:center;"><div style="font-family:'Space Grotesk';font-weight:700;font-size:18px;">${sess.plannedLoad}</div><div style="font-size:11px;color:#8A94A3;">UA alvo</div></div></div>
    ${total ? `<div class="seclabel" style="margin:0 4px 12px;">BLOCO PRINCIPAL</div><div style="display:flex;flex-direction:column;gap:9px;">${rows}</div>` : '<div style="text-align:center;color:#5A6472;font-size:13px;padding:10px 0;">Sessão sem exercícios detalhados.</div>'}
    ${cta}
  </div>${tabbar('athleteWorkout', 'ATHLETE')}`;
}

// ── TORNEIO ─────────────────────────────────────────────────────────────────
export function athleteTournament() {
  const a = myAthlete();
  const nt = nextTournament(a.id);
  if (!nt) return `<div class="pagepad" style="padding-top:58px;">${header('Próximo torneio')}<div style="text-align:center;color:#5A6472;font-size:13.5px;padding:30px 0;">Nenhum torneio agendado.</div></div>`;
  const days = diffDays(nt.startDate, todayISO());
  const tv = db.list('travels', t => t.tournamentId === nt.id)[0];
  const upcoming = db.list('sessions', s => s.athleteId === a.id && s.date >= todayISO() && s.date < nt.startDate).sort((x, y) => x.date.localeCompare(y.date)).slice(0, 3);
  const taper = upcoming.map((s, i) => `
    <div class="card" style="display:flex;align-items:center;gap:13px;padding:13px 15px;">
      <div style="width:30px;height:30px;border-radius:9px;background:${i === 0 ? 'rgba(52,224,161,.13)' : '#1C232C'};display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk';font-weight:700;font-size:12px;color:#8A94A3;">${i === 0 ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34E0A1" stroke-width="2.6"><path d="M5 12l5 5L20 7"/></svg>' : 'D−' + diffDays(nt.startDate, s.date)}</div>
      <div style="flex:1;"><div style="font-size:14px;font-weight:700;">${s.date === todayISO() ? 'Hoje' : fmtDow(s.date)} · ${esc(s.title)}</div>
      <div style="font-size:12px;color:#8A94A3;">${s.durationMinutes} min · RPE ${s.targetRpe}</div></div></div>`).join('') ||
    `<div style="text-align:center;color:#5A6472;font-size:13px;padding:10px 0;">Sem sessões antes do torneio.</div>`;
  return `<div class="pagepad" style="padding-top:58px;">
    ${header('Próximo torneio')}
    <div style="background:linear-gradient(150deg,#11203A,#0D1015);border:1px solid rgba(91,157,255,.3);border-radius:22px;padding:22px;margin-bottom:16px;text-align:center;">
      <div style="font-size:11px;font-weight:700;letter-spacing:.14em;color:#5B9DFF;">${esc(nt.name).toUpperCase()} · ${esc(nt.level)}</div>
      <div style="font-family:'Space Grotesk';font-weight:700;font-size:28px;margin:8px 0 4px;">${esc(nt.location)}</div>
      <div style="font-size:13px;color:#8A94A3;margin-bottom:18px;">${fmtShort(nt.startDate)} – ${fmtShort(nt.endDate)}${nt.isMainTarget ? ' · torneio alvo ★' : ''}</div>
      <div style="display:flex;justify-content:center;gap:14px;">
        <div style="background:rgba(255,255,255,.05);border-radius:13px;padding:12px 16px;"><div style="font-family:'Space Grotesk';font-weight:700;font-size:28px;color:#5B9DFF;">${String(days).padStart(2, '0')}</div><div style="font-size:10px;color:#8A94A3;">DIAS</div></div>
        <div style="background:rgba(255,255,255,.05);border-radius:13px;padding:12px 16px;"><div style="font-family:'Space Grotesk';font-weight:700;font-size:28px;">${upcoming.length}</div><div style="font-size:10px;color:#8A94A3;">SESSÕES ANTES</div></div></div></div>
    <div class="seclabel" style="margin:0 4px 12px;">ATÉ O TORNEIO</div>
    <div style="display:flex;flex-direction:column;gap:9px;">${taper}</div>
    ${tv ? `<div style="background:rgba(91,157,255,.08);border:1px solid rgba(91,157,255,.2);border-radius:14px;padding:14px 16px;margin-top:16px;display:flex;gap:11px;align-items:center;">${ICONS.clock('#5B9DFF')}<span style="font-size:13px;color:#C7CFDA;line-height:1.4;">Viagem ${esc(tv.origin)} → ${esc(tv.destination)} em ${fmtShort(tv.departureDate)}.</span></div>` : ''}
  </div>`;
}

// ── RECOVERY ────────────────────────────────────────────────────────────────
export function athleteRecovery() {
  const a = myAthlete();
  const c = latestCheckin(a.id);
  const r = c ? c.readinessScore : 0;
  const color = r >= 80 ? '#34E0A1' : r >= 65 ? '#FFC24B' : '#FF5D5D';
  const recs = [];
  recs.push(['#5B9DFF', `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#5B9DFF" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><path d="M12 8v8M8 12h8"/></svg>`, 'Banho de imersão fria', '10 min · 12°C · pós-treino']);
  if (c && c.painLocation) recs.push(['#FFC24B', ICONS.warn('#FFC24B'), `Cuidado com ${esc(c.painLocation)}`, `dor ${c.painScore}/10 · avisar treinador se persistir`]);
  else recs.push(['#34E0A1', `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#34E0A1" stroke-width="2"><path d="M4 12c4-6 12-6 16 0M6 16c3-4 9-4 12 0"/></svg>`, 'Mobilidade de tornozelo', '8 min · foco no ponto fraco']);
  recs.push(['#FFC24B', `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#FFC24B" stroke-width="2"><path d="M12 2v6M12 8c-3 0-5 2-5 6 0 4 2 6 5 6s5-2 5-6c0-4-2-6-5-6z"/></svg>`, 'Hidratação + 30g proteína', 'janela de 45 min']);
  return `<div class="pagepad">
    <div style="font-family:'Space Grotesk';font-weight:700;font-size:23px;margin-bottom:16px;">Recuperação</div>
    <div class="card" style="border-radius:20px;padding:18px;margin-bottom:14px;">
      <div style="display:flex;align-items:center;gap:16px;">
        ${c ? ring(r, color, 70, 54, 21) : '<div style="width:70px;"></div>'}
        <div style="flex:1;"><div class="seclabel" style="letter-spacing:.1em;">RECOVERY SCORE</div>
        <div style="font-size:15px;color:#C7CFDA;margin-top:4px;line-height:1.4;">${c ? (r >= 80 ? 'Recuperação alta — pode treinar em alta intensidade.' : r >= 65 ? 'Recuperação média — modere o volume hoje.' : 'Recuperação baixa — priorize o regenerativo.') : 'Sem check-in hoje. Faça o check-in para calcular.'}</div></div></div></div>
    <div style="display:flex;gap:11px;margin-bottom:14px;">
      <div class="card" style="flex:1;border-radius:15px;padding:14px;"><div class="seclabel" style="letter-spacing:.1em;">SONO</div><div style="font-family:'Space Grotesk';font-weight:700;font-size:22px;margin-top:5px;${c && c.sleepHours >= 7 ? 'color:#34E0A1;' : ''}">${c ? c.sleepHours.toFixed(1) : '—'}<span style="font-size:12px;color:#8A94A3;"> h</span></div></div>
      <div class="card" style="flex:1;border-radius:15px;padding:14px;"><div class="seclabel" style="letter-spacing:.1em;">ENERGIA</div><div style="font-family:'Space Grotesk';font-weight:700;font-size:22px;margin-top:5px;">${c ? c.energy : '—'}<span style="font-size:12px;color:#8A94A3;"> /5</span></div></div>
      <div class="card" style="flex:1;border-radius:15px;padding:14px;"><div class="seclabel" style="letter-spacing:.1em;">DOR</div><div style="font-family:'Space Grotesk';font-weight:700;font-size:22px;margin-top:5px;${c && c.painScore >= 4 ? 'color:#FF5D5D;' : ''}">${c ? (c.painScore || c.musclePain) : '—'}</div></div></div>
    <div class="seclabel" style="margin:4px 4px 12px;">RECOMENDADO HOJE</div>
    <div style="display:flex;flex-direction:column;gap:9px;">
      ${recs.map(([color2, icon, title, sub]) => `<div class="card" style="display:flex;align-items:center;gap:13px;padding:14px 15px;">
        <div style="width:40px;height:40px;border-radius:11px;background:${color2}21;display:flex;align-items:center;justify-content:center;">${icon}</div>
        <div style="flex:1;"><div style="font-size:14.5px;font-weight:700;">${title}</div><div style="font-size:12px;color:#8A94A3;">${sub}</div></div></div>`).join('')}
    </div>
  </div>${tabbar('athleteRecovery', 'ATHLETE')}`;
}

// ── HISTÓRICO DO ATLETA ─────────────────────────────────────────────────────
export function athleteHistory() {
  const a = myAthlete();
  const streak = streakDays(a.id);
  const mon = mondayOf(todayISO());
  const weeks = Array.from({ length: 12 }, (_, i) => addDays(mon, -7 * (11 - i)));
  const loads = weeks.map(w => weekLoad(a.id, w));
  const max = Math.max(...loads, 1);
  const growth = loads[11] && loads[7] ? Math.round((loads[11] / Math.max(loads[7], 1) - 1) * 100) : 0;
  const bars = loads.map((l, i) => `<div style="flex:1;height:${Math.max(6, Math.round(92 * l / max))}%;background:${i >= 8 ? '#FF6A3D' : '#2A323D'};border-radius:3px;"></div>`).join('');
  const recent = db.list('sessions', s => s.athleteId === a.id && s.status === 'COMPLETED').sort((x, y) => y.date.localeCompare(x.date)).slice(0, 5);
  const rows = recent.map(s => `
    <div class="card" style="display:flex;align-items:center;gap:13px;padding:13px 15px;">
      <div style="text-align:center;width:34px;"><div style="font-family:'Space Grotesk';font-weight:700;font-size:15px;">${fmtDayNum(s.date)}</div><div style="font-size:10px;color:#5A6472;">${fmtDow(s.date)}</div></div>
      <div style="width:1px;height:30px;background:rgba(255,255,255,.08);"></div>
      <div style="flex:1;"><div style="font-size:14px;font-weight:700;">${esc(s.title)}</div><div style="font-size:12px;color:#8A94A3;">RPE ${s.rpeFinal} · concluído</div></div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34E0A1" stroke-width="2.4"><path d="M5 12l5 5L20 7"/></svg></div>`).join('') ||
    `<div style="text-align:center;color:#5A6472;font-size:13.5px;padding:20px 0;">Nenhuma sessão concluída ainda.</div>`;
  return `<div class="pagepad" style="padding-top:58px;">
    ${header('Seu histórico')}
    <div style="background:linear-gradient(135deg,#1A1410,#0D1015);border:1px solid rgba(255,106,61,.2);border-radius:20px;padding:20px;margin-bottom:16px;display:flex;align-items:center;gap:18px;">
      <div style="width:60px;height:60px;border-radius:17px;background:rgba(255,106,61,.14);display:flex;flex-direction:column;align-items:center;justify-content:center;"><span style="font-family:'Space Grotesk';font-weight:700;font-size:24px;color:#FF6A3D;">${streak}</span></div>
      <div><div style="font-size:16px;font-weight:700;">Dias seguidos treinando</div><div style="font-size:13px;color:#8A94A3;margin-top:3px;">${streak >= 7 ? 'Melhor sequência da temporada 🔥' : 'Construindo consistência 💪'}</div></div></div>
    <div class="card" style="border-radius:18px;padding:16px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;"><span style="font-size:13px;color:#8A94A3;">Volume · 12 semanas</span>
      <span style="font-family:'Space Grotesk';font-weight:700;font-size:16px;color:${growth >= 0 ? '#34E0A1' : '#FFC24B'};">${growth >= 0 ? '▲' : '▼'} ${Math.abs(growth)}%</span></div>
      <div style="display:flex;align-items:flex-end;gap:4px;height:58px;">${bars}</div></div>
    <div class="seclabel" style="margin:0 4px 12px;">ÚLTIMAS SESSÕES</div>
    <div style="display:flex;flex-direction:column;gap:9px;">${rows}</div>
  </div>`;
}

// ── MENSAGENS ───────────────────────────────────────────────────────────────
export function athleteMessages() {
  const u = auth.current();
  const other = u.role === 'TRAINER' ? db.list('users', x => x.role === 'ATHLETE')[0] : db.list('users', x => x.role === 'TRAINER')[0];
  const thread = db.list('messages', m => (m.senderId === u.id && m.receiverId === other.id) || (m.senderId === other.id && m.receiverId === u.id)).sort((a, b) => a.createdAt - b.createdAt);
  // marcar como lidas as recebidas
  let changed = false;
  thread.forEach(m => { if (m.receiverId === u.id && !m.read) { m.read = true; changed = true; } });
  if (changed) db.save();
  const bubbles = thread.map(m => {
    const mine = m.senderId === u.id;
    const time = new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `<div style="max-width:78%;align-self:${mine ? 'flex-end' : 'flex-start'};background:${mine ? '#FF6A3D' : '#1C232C'};border-radius:${mine ? '16px 16px 5px 16px' : '16px 16px 16px 5px'};padding:12px 15px;">
      <div style="font-size:14px;line-height:1.4;${mine ? 'color:#0B0E12;font-weight:500;' : ''}">${esc(m.content)}</div>
      <div style="font-size:10px;color:${mine ? 'rgba(11,14,18,.55)' : '#5A6472'};margin-top:5px;">${time}</div></div>`;
  }).join('');
  return `
    <div style="position:absolute;top:50px;left:0;right:0;padding:8px 22px 14px;background:#0B0E12;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:12px;z-index:4;">
      <div class="tap backbtn" data-action="tab" data-screen="${u.role === 'TRAINER' ? 'coachDash' : 'athleteHome'}">${ICONS.back}</div>
      ${avatar(other.avatarInitials, 42, 'linear-gradient(135deg,#FF6A3D,#FF9A3D)', '#0B0E12')}
      <div><div style="font-weight:700;font-size:15px;">${esc(other.name)}</div>
      <div style="font-size:11.5px;color:#34E0A1;">online · ${other.role === 'TRAINER' ? 'treinador' : 'atleta'}</div></div></div>
    <div id="msg-scroll" style="position:absolute;top:118px;bottom:74px;left:0;right:0;padding:18px;display:flex;flex-direction:column;gap:12px;overflow-y:auto;">
      <div style="text-align:center;font-size:11px;color:#5A6472;">CONVERSA</div>${bubbles}</div>
    <div style="position:absolute;bottom:0;left:0;right:0;height:74px;background:rgba(11,14,18,.95);border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:11px;padding:0 18px;">
      <input id="msg-input" placeholder="Mensagem..." style="flex:1;background:#1C232C;border:none;border-radius:20px;padding:13px 16px;font-size:14px;color:#F4F6F8;font-family:'Manrope';outline:none;">
      <div class="tap" data-action="msg-send" style="width:44px;height:44px;border-radius:50%;background:#FF6A3D;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="20" height="20" viewBox="0 0 24 24" fill="#0B0E12"><path d="M3 11 21 3l-8 18-2-7z"/></svg></div></div>`;
}

// ── PERFIL DO ATLETA ────────────────────────────────────────────────────────
export function athleteProfile() {
  const a = myAthlete();
  const total = db.list('sessions', s => s.athleteId === a.id && s.status === 'COMPLETED').length;
  const streak = streakDays(a.id);
  const assess = db.list('assessments', x => x.athleteId === a.id).sort((x, y) => y.date.localeCompare(x.date))[0];
  return `<div class="pagepad">
    <div style="display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:20px;">
      ${avatar(initialsOf(a.name), 84, 'linear-gradient(135deg,#2A323D,#3A4350)', '#F4F6F8', '26px')}
      <div style="font-family:'Space Grotesk';font-weight:700;font-size:22px;margin-top:14px;">${esc(a.name)}</div>
      <div style="font-size:13px;color:#8A94A3;margin-top:3px;">Beach Tennis · ${esc(a.notes || a.category)}</div>
      <div style="display:inline-flex;align-items:center;gap:7px;padding:7px 14px;border-radius:999px;background:rgba(255,106,61,.13);margin-top:12px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF6A3D"><path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></svg>
        <span style="font-size:12.5px;font-weight:700;color:#FF6A3D;">Atleta Pro · Equipe Brasil</span></div></div>
    <div style="display:flex;gap:11px;margin-bottom:18px;">
      <div class="tap card" data-action="go" data-screen="athleteHistory" style="flex:1;border-radius:16px;padding:16px;text-align:center;"><div style="font-family:'Space Grotesk';font-weight:700;font-size:22px;">${total}</div><div style="font-size:11px;color:#8A94A3;margin-top:3px;">treinos</div></div>
      <div class="tap card" data-action="go" data-screen="athleteHistory" style="flex:1;border-radius:16px;padding:16px;text-align:center;"><div style="font-family:'Space Grotesk';font-weight:700;font-size:22px;color:#FF6A3D;">${streak}</div><div style="font-size:11px;color:#8A94A3;margin-top:3px;">sequência</div></div>
      <div class="card" style="flex:1;border-radius:16px;padding:16px;text-align:center;"><div style="font-family:'Space Grotesk';font-weight:700;font-size:22px;color:#34E0A1;">${assess ? assess.generalIndex : '—'}</div><div style="font-size:11px;color:#8A94A3;margin-top:3px;">índice físico</div></div></div>
    <div class="seclabel" style="margin:0 4px 12px;">CONTA</div>
    <div class="card" style="display:flex;flex-direction:column;gap:1px;border-radius:16px;overflow:hidden;">
      <div class="tap" data-action="future" data-arg="Edição de dados pessoais" style="display:flex;align-items:center;gap:13px;padding:15px;"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#8A94A3" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg><span style="flex:1;font-size:14.5px;">Dados pessoais</span>${ICONS.chev}</div>
      <div style="height:1px;background:rgba(255,255,255,.05);"></div>
      <div class="tap" data-action="go" data-screen="athleteHistory" style="display:flex;align-items:center;gap:13px;padding:15px;"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#8A94A3" stroke-width="2"><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 5-6"/></svg><span style="flex:1;font-size:14.5px;">Histórico de treinos</span>${ICONS.chev}</div>
      <div style="height:1px;background:rgba(255,255,255,.05);"></div>
      <div class="tap" data-action="future" data-arg="Integração WHOOP" style="display:flex;align-items:center;gap:13px;padding:15px;"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#8A94A3" stroke-width="2"><path d="M12 3v3m0 12v3M3 12h3m12 0h3"/><circle cx="12" cy="12" r="4"/></svg><span style="flex:1;font-size:14.5px;">Dispositivos · WHOOP</span><span style="font-size:12px;color:#34E0A1;">mock</span></div>
      <div style="height:1px;background:rgba(255,255,255,.05);"></div>
      <div class="tap" data-action="logout" style="display:flex;align-items:center;gap:13px;padding:15px;"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#FF5D5D" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg><span style="flex:1;font-size:14.5px;color:#FF5D5D;">Sair</span></div>
    </div>
  </div>${tabbar('athleteProfile', 'ATHLETE')}`;
}

// ── LOGIN ───────────────────────────────────────────────────────────────────
export function login(ctx) {
  const role = ctx.loginRole || 'TRAINER';
  return `
    <div style="position:absolute;inset:0;background:radial-gradient(420px 320px at 50% 8%,rgba(255,106,61,.22),transparent 60%);"></div>
    <div style="position:relative;height:100%;display:flex;flex-direction:column;padding:50px 30px 0;">
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;">
        <div style="width:64px;height:64px;border-radius:19px;background:#FF6A3D;display:flex;align-items:center;justify-content:center;box-shadow:0 14px 40px -8px rgba(255,106,61,.7);margin-bottom:24px;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M5 13.5C8 17 12 18 19 16" stroke="#0B0E12" stroke-width="2.6" stroke-linecap="round"/><circle cx="8.5" cy="8" r="3.4" stroke="#0B0E12" stroke-width="2.6"/></svg></div>
        <div style="font-family:'Space Grotesk';font-weight:700;font-size:26px;letter-spacing:-.01em;">BT performance</div>
        <div style="font-size:14px;color:#8A94A3;margin-top:6px;">Preparação que decide.</div></div>
      <div style="flex:1.3;display:flex;flex-direction:column;justify-content:center;">
        <div style="display:flex;background:#14181F;border-radius:14px;padding:5px;margin-bottom:18px;">
          <div class="tap" data-action="login-role" data-arg="TRAINER" style="flex:1;text-align:center;padding:11px;border-radius:10px;background:${role === 'TRAINER' ? '#FF6A3D' : 'transparent'};color:${role === 'TRAINER' ? '#0B0E12' : '#8A94A3'};font-weight:700;font-size:14px;">Treinador</div>
          <div class="tap" data-action="login-role" data-arg="ATHLETE" style="flex:1;text-align:center;padding:11px;border-radius:10px;background:${role === 'ATHLETE' ? '#FF6A3D' : 'transparent'};color:${role === 'ATHLETE' ? '#0B0E12' : '#8A94A3'};font-weight:700;font-size:14px;">Atleta</div></div>
        <div style="display:flex;align-items:center;gap:12px;background:#14181F;border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:4px 16px;margin-bottom:12px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A6472" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
          <input id="login-email" type="email" autocomplete="username" value="${role === 'TRAINER' ? 'rafael@equipebrasil.com' : 'joao@atleta.com'}" style="flex:1;background:none;border:none;outline:none;color:#F4F6F8;font-family:'Manrope';font-size:15px;padding:12px 0;"></div>
        <div style="display:flex;align-items:center;gap:12px;background:#14181F;border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:4px 16px;margin-bottom:22px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A6472" stroke-width="2"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
          <input id="login-password" type="password" autocomplete="current-password" placeholder="senha (123456)" style="flex:1;background:none;border:none;outline:none;color:#F4F6F8;font-family:'Manrope';font-size:15px;letter-spacing:.15em;padding:12px 0;"></div>
        <button class="tap btn-primary" data-action="login-enter" style="padding:17px;box-shadow:0 12px 30px -8px rgba(255,106,61,.5);">Entrar como ${role === 'TRAINER' ? 'treinador' : 'atleta'}</button>
        <div class="tap" data-action="future" data-arg="Face ID" style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:18px;color:#8A94A3;font-size:14px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF6A3D" stroke-width="2"><path d="M12 2a3 3 0 0 1 3 3v3a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>Entrar com Face ID</div></div>
      <div class="tap" data-action="forgot" style="text-align:center;font-size:13px;color:#5A6472;padding-bottom:26px;">Esqueceu a senha?</div>
    </div>`;
}
