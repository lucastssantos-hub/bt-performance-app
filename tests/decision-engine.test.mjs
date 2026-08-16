import assert from 'node:assert/strict';
import { analyzeAthleteWeek } from '../js/decision-engine.js';

const today = '2026-08-14';
const athlete = { id: 'atleta-teste', status: 'ACTIVE' };
const dates = ['2026-08-14','2026-08-13','2026-08-12','2026-08-11','2026-08-10'];
const wellness = dates.map((date, i) => ({ athleteId: athlete.id, date, prontidao: 20, banda: 'VERDE', painScore: 0, painLocation: '', readinessScore: 86 + i }));
const currentAssessment = { athleteId: athlete.id, date: '2026-08-01', cmj: 40, sj: 35, sprint5m: 1.2, sprint10m: 2.1, mbLateralD: 5, mbLateralE: 5 };
const previousAssessment = { ...currentAssessment, date: '2026-07-01', cmj: 39, sj: 34, sprint5m: 1.21, sprint10m: 2.12, mbLateralD: 4.9, mbLateralE: 4.9 };
const sessions = dates.slice(0, 3).map((date, i) => ({ athleteId: athlete.id, date, status: 'COMPLETED', durationMinutes: 45, rpeFinal: 6, title: `Sessão ${i}` }));
const base = { athlete, today, checkins: wellness, sessions, assessments: [currentAssessment, previousAssessment], tournaments: [{ id: 'futuro', athletes: [athlete.id], name: 'Open futuro', startDate: '2026-09-20', endDate: '2026-09-21' }], travels: [] };

const progression = analyzeAthleteWeek(base);
assert.equal(progression.week.type, 'TREINO');
assert.equal(progression.confidence, 'ALTA');
assert.equal(progression.decision, 'PROGREDIR');

const preCompetition = analyzeAthleteWeek({ ...base, tournaments: [{ id: 'a', athletes: [athlete.id], name: 'Torneio A', startDate: '2026-08-18', endDate: '2026-08-20', isMainTarget: true }] });
assert.equal(preCompetition.week.type, 'PRÉ-COMPETIÇÃO');
assert.notEqual(preCompetition.decision, 'PROGREDIR');

const persistentPain = wellness.map((c, i) => i < 3 ? { ...c, painScore: 4, painLocation: 'ombro direito' } : c);
const referral = analyzeAthleteWeek({ ...base, checkins: persistentPain });
assert.equal(referral.decision, 'ENCAMINHAR');

const missingAssessment = analyzeAthleteWeek({ ...base, assessments: [] });
assert.equal(missingAssessment.confidence, 'BAIXA');
assert.equal(missingAssessment.decision, 'REAVALIAR');

const painToday = analyzeAthleteWeek({ ...base, checkins: wellness.map((c, i) => i === 0 ? { ...c, painScore: 6, painLocation: 'joelho' } : c) });
assert.equal(painToday.decision, 'REDUZIR');

const movementPain = analyzeAthleteWeek({ ...base, checkins: wellness.map((c, i) => i === 0 ? { ...c, painScore: 3, painLocation: 'joelho', alteraMovimento: true } : c) });
assert.equal(movementPain.decision, 'ENCAMINHAR');

const secondaryCompetition = analyzeAthleteWeek({ ...base, tournaments: [{ id: 'b', athletes: [athlete.id], name: 'Torneio B', startDate: '2026-08-16', endDate: '2026-08-17', isMainTarget: false }] });
assert.equal(secondaryCompetition.week.type, 'PRÉ-COMPETIÇÃO');
assert.equal(secondaryCompetition.decision, 'REDUZIR');

const plannedOnly = analyzeAthleteWeek({ ...base, sessions: [{ athleteId: athlete.id, date: today, status: 'PLANNED', plannedLoad: 9999 }] });
assert.equal(plannedOnly.dimensions.carga, 'sem carga executada na semana');
assert.equal(plannedOnly.confidence, 'BAIXA');

const unrelatedTravel = analyzeAthleteWeek({ ...base, travels: [{ departureDate: today, arrivalDate: today, travelHours: 10, destination: 'Outro atleta' }] });
assert.equal(unrelatedTravel.week.type, 'TREINO');

const singleAssessment = analyzeAthleteWeek({ ...base, assessments: [currentAssessment] });
assert.equal(singleAssessment.confidence, 'MÉDIA');
assert.equal(singleAssessment.signals.some(s => s.type === 'avaliacao_sem_comparacao' && s.severity === 'ATENÇÃO'), true);

console.log('decision-engine: 10 cenários canônicos aprovados');
