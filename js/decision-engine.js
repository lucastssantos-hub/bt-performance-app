// decision-engine.js — composição determinística do Radar de Evidências.
// Não prescreve treino: classifica a semana, explicita as 4 dimensões e sugere
// uma rota conservadora para confirmação humana.

const DAY = 86400000;
const diffDays = (a, b) => Math.round((new Date(`${a}T12:00:00`) - new Date(`${b}T12:00:00`)) / DAY);
const addDays = (base, n) => {
  const d = new Date(`${base}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const mondayOf = (date) => {
  const d = new Date(`${date}T12:00:00`);
  return addDays(date, -((d.getDay() + 6) % 7));
};
const sum = (list) => list.reduce((acc, value) => acc + value, 0);
// Carga observada e carga planejada respondem a perguntas diferentes. O radar
// usa somente trabalho efetivamente concluído; sessões futuras, canceladas ou
// sem PSE não podem inflar a exposição do atleta.
const executedSessionLoad = (s) => s.status === 'COMPLETED' && s.rpeFinal != null
  ? Math.round((Number(s.durationMinutes) || 0) * Number(s.rpeFinal))
  : 0;

function weekLoad(sessions, start, end = addDays(start, 6)) {
  return sum(sessions.filter(s => s.date >= start && s.date <= end).map(executedSessionLoad));
}

function assessmentTrend(current, previous) {
  const required = ['cmj', 'sj', 'sprint5m', 'sprint10m', 'mbLateralD', 'mbLateralE'];
  const complete = !!current && required.every(key => Number(current[key]) > 0);
  if (!complete) return { complete: false, stableOrUp: false, declining: false, label: 'bateria obrigatória incompleta' };
  if (!previous || !required.every(key => Number(previous[key]) > 0)) {
    return { complete: true, comparable: false, stableOrUp: false, declining: false, label: 'sem avaliação anterior comparável' };
  }
  const changes = required.map(key => {
    const lowerIsBetter = key.startsWith('sprint');
    const pct = ((current[key] - previous[key]) / previous[key]) * 100;
    const performancePct = lowerIsBetter ? -pct : pct;
    const swc = lowerIsBetter ? 3 : 5;
    return performancePct < -swc ? -1 : performancePct > swc ? 1 : 0;
  });
  const declining = changes.filter(v => v < 0).length >= 2;
  return {
    complete: true,
    comparable: true,
    stableOrUp: !declining,
    declining,
    label: declining ? 'queda relevante em 2+ testes' : 'testes estáveis ou subindo',
  };
}

function classifyWeek(today, tournaments, travels) {
  const current = tournaments.find(t => t.startDate <= today && (t.endDate || t.startDate) >= today);
  if (current) return { type: 'COMPETIÇÃO', reason: current.name };
  const recent = tournaments.find(t => {
    const end = t.endDate || t.startDate;
    const ago = diffDays(today, end);
    return ago >= 0 && ago <= 3;
  });
  if (recent) return { type: 'PÓS-COMPETIÇÃO', reason: recent.name };
  const nextCompetition = tournaments.find(t => {
    const days = diffDays(t.startDate, today);
    return days >= 0 && (days <= 3 || (t.isMainTarget && days <= 7));
  });
  if (nextCompetition) return { type: 'PRÉ-COMPETIÇÃO', reason: nextCompetition.name };
  const travel = travels.find(v => {
    const start = v.departureDate || today;
    const end = v.arrivalDate || start;
    const relevant = start <= addDays(today, 6) && end >= addDays(today, -1);
    return relevant && ((Number(v.travelHours) || 0) >= 6 || Math.abs(Number(v.timezoneHours) || 0) >= 3);
  });
  if (travel) return { type: 'VIAGEM', reason: travel.destination || 'deslocamento relevante' };
  return { type: 'TREINO', reason: 'sem competição ou viagem restritiva na janela' };
}

export function analyzeAthleteWeek({ athlete, today, checkins = [], sessions = [], assessments = [], tournaments = [], travels = [] }) {
  const athleteCheckins = checkins.filter(c => c.athleteId === athlete.id && c.date >= addDays(today, -6) && c.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date));
  const latest = athleteCheckins[0] || null;
  const athleteSessions = sessions.filter(s => s.athleteId === athlete.id);
  const athleteAssessments = assessments.filter(a => a.athleteId === athlete.id).sort((a, b) => b.date.localeCompare(a.date));
  const athleteTournaments = tournaments.filter(t => (t.athletes || []).includes(athlete.id)).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const athleteTravels = travels.filter(v => v.athleteId === athlete.id || athleteTournaments.some(t => t.id === v.tournamentId));
  const week = classifyWeek(today, athleteTournaments, athleteTravels);
  const signals = [];
  const add = (severity, type, text, numbers, weight = 'auxiliar') => signals.push({ severity, type, text, numbers, weight });

  const painByRegion = new Map();
  athleteCheckins.forEach(c => {
    if (c.painScore >= 3) {
      const region = String(c.painLocation || 'não informada').trim().toLowerCase();
      if (!painByRegion.has(region)) painByRegion.set(region, new Set());
      painByRegion.get(region).add(c.date);
    }
  });
  const persistentPain = [...painByRegion.entries()].find(([, dates]) => dates.size >= 3);
  const injuryActive = athlete.status === 'INJURED';
  if (persistentPain) add('RISCO', 'dor_persistente', `Dor ≥ 3/10 em 3+ dias · ${persistentPain[0]}`, `${persistentPain[1].size}/7 dias`, 'decisivo');
  if (injuryActive) add('RISCO', 'lesao_ativa', 'Lesão ativa registrada', 'restrição mantida', 'decisivo');
  if (latest && latest.painScore >= 6) add('RISCO', 'dor_alta', `Dor alta hoje${latest.painLocation ? ` · ${latest.painLocation}` : ''}`, `${latest.painScore}/10`, 'forte');
  if (latest && latest.alteraMovimento) add('RISCO', 'dor_altera', 'Dor altera o movimento', `${latest.painScore}/10`, 'decisivo');

  const readinessByDate = new Map(athleteCheckins.map(c => [c.date, c]));
  const redConsecutive = [...Array(6)].some((_, i) => {
    const a = readinessByDate.get(addDays(today, -i));
    const b = readinessByDate.get(addDays(today, -i - 1));
    return a && b && a.prontidao != null && b.prontidao != null && a.prontidao <= 14 && b.prontidao <= 14;
  });
  if (redConsecutive) add('RISCO', 'prontidao_vermelha_2d', 'Prontidão VERMELHA em 2 dias seguidos', `${latest?.prontidao ?? '—'}/25`, 'forte');
  else if (latest?.banda === 'VERMELHO') add('ATENÇÃO', 'prontidao_vermelha', 'Prontidão VERMELHA hoje', `${latest.prontidao}/25`, 'auxiliar');
  else if (latest?.banda === 'AMARELO') add('ATENÇÃO', 'prontidao_amarela', 'Prontidão AMARELA hoje', `${latest.prontidao}/25`, 'auxiliar');
  else if (latest?.banda === 'VERDE') add('OPORTUNIDADE', 'prontidao_verde', 'Prontidão VERDE', `${latest.prontidao}/25`, 'favorável');

  const currentAssessment = athleteAssessments[0];
  const assessmentAge = currentAssessment ? diffDays(today, currentAssessment.date) : Infinity;
  const trend = assessmentTrend(currentAssessment, athleteAssessments[1]);
  if (!trend.complete || assessmentAge > 84) add('ATENÇÃO', 'avaliacao_insuficiente', 'Avaliação ausente, incompleta ou vencida', Number.isFinite(assessmentAge) ? `${assessmentAge} dias` : 'não realizada', 'informação');
  else if (trend.declining && !['COMPETIÇÃO', 'PÓS-COMPETIÇÃO'].includes(week.type)) add('RISCO', 'testes_queda', trend.label, fmtAssessmentAge(assessmentAge), 'forte');
  else if (!trend.comparable) add('ATENÇÃO', 'avaliacao_sem_comparacao', trend.label, fmtAssessmentAge(assessmentAge), 'informação');
  else add('OPORTUNIDADE', 'testes_estaveis', trend.label, fmtAssessmentAge(assessmentAge), 'favorável');

  const monday = mondayOf(today);
  // Semana corrente parcial (segunda até hoje) contra semanas anteriores
  // na mesma quantidade de dias das semanas anteriores. Nunca inclui carga
  // planejada nem dias futuros.
  const currentLoad = weekLoad(athleteSessions, monday, today);
  const daysIntoWeek = diffDays(today, monday);
  const previousLoads = [1, 2, 3].map(n => {
    const previousMonday = addDays(monday, -7 * n);
    return weekLoad(athleteSessions, previousMonday, addDays(previousMonday, daysIntoWeek));
  });
  const historical = previousLoads.filter(v => v > 0);
  const baselineLoad = historical.length ? sum(historical) / historical.length : 0;
  const loadRatio = baselineLoad > 0 ? currentLoad / baselineLoad : null;
  const completedCurrentWeek = athleteSessions.filter(s => s.status === 'COMPLETED' && s.date >= monday && s.date <= today);
  const pseComplete = completedCurrentWeek.length > 0 && completedCurrentWeek.every(s => s.rpeFinal != null);
  if (loadRatio > 1.5 && !['COMPETIÇÃO', 'PÓS-COMPETIÇÃO'].includes(week.type)) add('RISCO', 'salto_carga', 'Salto de carga total', `${loadRatio.toFixed(2)}× a média`, 'forte');
  else if (!completedCurrentWeek.length) add('ATENÇÃO', 'sem_carga', 'Semana sem carga executada', '0 sessões concluídas', 'lacuna');
  else add('OPORTUNIDADE', 'carga_registrada', 'Carga com PSE registrada', `${currentLoad.toLocaleString('pt-BR')} UA`, 'favorável');

  if (week.type !== 'TREINO') add(week.type === 'VIAGEM' ? 'ATENÇÃO' : 'RISCO', 'contexto_semana', `Semana de ${week.type}`, week.reason, 'contexto');
  const future28 = athleteTournaments.filter(t => diffDays(t.startDate, today) >= 0 && diffDays(t.startDate, today) <= 28);
  const competitiveRisk = future28.length >= 2 || week.type !== 'TREINO' ? 'ALTO' : future28.length === 1 ? 'MODERADO' : 'BAIXO';

  let confidence = 'ALTA';
  const missing = [];
  if (athleteCheckins.length < 3) { confidence = 'BAIXA'; missing.push('wellness em pelo menos 3 dias'); }
  else if (athleteCheckins.length < 5) { confidence = 'MÉDIA'; missing.push('wellness em 5/7 dias para confiança alta'); }
  if (!completedCurrentWeek.length) { confidence = 'BAIXA'; missing.push('carga executada da semana'); }
  else if (!pseComplete && confidence === 'ALTA') { confidence = 'MÉDIA'; missing.push('PSE em todas as sessões'); }
  if (!trend.complete || assessmentAge > 84) { confidence = 'BAIXA'; missing.push('bateria física obrigatória atualizada'); }
  else if (!trend.comparable && confidence === 'ALTA') { confidence = 'MÉDIA'; missing.push('segunda avaliação comparável'); }
  else if (assessmentAge > 42 && confidence === 'ALTA') { confidence = 'MÉDIA'; missing.push('avaliação com menos de 6 semanas'); }

  const decisive = signals.some(s => s.weight === 'decisivo');
  const strong = signals.filter(s => s.weight === 'forte').length;
  let decision = 'MANTER';
  if (decisive) decision = 'ENCAMINHAR';
  else if (week.type === 'PÓS-COMPETIÇÃO' && strong >= 1) decision = 'DESCARREGAR';
  else if (strong >= 2) decision = 'DESCARREGAR';
  else if (strong >= 1) decision = 'REDUZIR';
  else if (!trend.complete || assessmentAge > 84) decision = 'REAVALIAR';
  else if (week.type === 'PÓS-COMPETIÇÃO' || week.type === 'PRÉ-COMPETIÇÃO' || week.type === 'COMPETIÇÃO') decision = 'REDUZIR';
  else if (week.type === 'VIAGEM') decision = 'MANTER';
  else if (week.type === 'TREINO' && confidence === 'ALTA' && latest?.prontidao >= 18 && (latest.painScore || 0) <= 2 && !latest.alteraMovimento && trend.stableOrUp && strong === 0 && competitiveRisk !== 'ALTO') decision = 'PROGREDIR';

  const category = decision === 'ENCAMINHAR' || decision === 'DESCARREGAR' || decision === 'REDUZIR'
    ? 'RISCO' : decision === 'REAVALIAR' || confidence === 'BAIXA' || signals.some(s => s.severity === 'ATENÇÃO') ? 'ATENÇÃO' : 'OPORTUNIDADE';
  const primarySignal = signals.find(s => s.severity === category) || signals[0] || null;
  const dimensions = {
    testes: currentAssessment ? `${trend.label} · ${fmtAssessmentAge(assessmentAge)}` : 'sem avaliação',
    wellness: latest?.prontidao != null ? `${latest.prontidao}/25 · ${latest.banda}` : 'sem check-in recente',
    carga: completedCurrentWeek.length ? `${currentLoad.toLocaleString('pt-BR')} UA · ${completedCurrentWeek.length} sessão(ões)` : 'sem carga executada na semana',
    contexto: `${week.type} · risco competitivo ${competitiveRisk.toLowerCase()}`,
  };

  return { category, signals, confidence, decision, primarySignal, week, competitiveRisk, missing: [...new Set(missing)], dimensions };
}

function fmtAssessmentAge(age) {
  return Number.isFinite(age) ? `${age} dia${age === 1 ? '' : 's'}` : 'não realizada';
}
