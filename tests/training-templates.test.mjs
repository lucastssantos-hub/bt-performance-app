import assert from 'node:assert/strict';
import { EVIDENCE_RULES, TRAINING_LEVEL_PROFILES, TRAINING_TEMPLATES, getTrainingTemplate, instantiateTrainingTemplate, validateSessionAgainstTemplate } from '../js/training-templates.js';

assert.deepEqual(Object.keys(TRAINING_TEMPLATES), ['A0', 'A1', 'A2', 'A3']);
assert.equal(EVIDENCE_RULES.POWER_ACSM_2026.parameters.totalRepsMax, 24);
assert.equal(EVIDENCE_RULES.COMBINED_STRENGTH_PLYOMETRIC_2026.parameters.complementaryStrengthSupported, true);
assert.equal(TRAINING_LEVEL_PROFILES.FOUNDATION.strength.oneRmTestRequired, false);
assert.deepEqual(TRAINING_LEVEL_PROFILES.FOUNDATION.strength.reps, { min: 6, max: 8 });
assert.deepEqual(TRAINING_LEVEL_PROFILES.FOUNDATION.strength.rir, { min: 3, max: 4 });
assert.deepEqual(TRAINING_LEVEL_PROFILES.FOUNDATION.plyometric.allowedIntensity, ['LOW']);
assert.notEqual(getTrainingTemplate('a1'), TRAINING_TEMPLATES.A1, 'get deve devolver clone editável');

const strength = instantiateTrainingTemplate('A1', { athleteId: 'a1', date: '2026-08-14' });
assert.equal(strength.trainingLevel, 'PERFORMANCE');
strength.target.durationMinutes = 55;
strength.target.sessionRpeMax = 8;
strength.sections.find(s => s.role === 'SPECIFIC_PREPARATION').items.push({ exerciseId: 'prep-1', dose: {} });
strength.sections.find(s => s.role === 'PRIMARY').items.push({
  exerciseId: 'squat', method: 'HEAVY_RESISTANCE',
  dose: { sets: 3, reps: 4, intensity: { type: 'PERCENT_1RM', target: 85 } },
});
const validStrength = validateSessionAgainstTemplate(strength);
assert.equal(validStrength.valid, true);
assert.equal(validStrength.status, 'REVIEW_REQUIRED', 'hipóteses D exigem revisão');

const foundation = instantiateTrainingTemplate('A0', { athleteId: 'novice', date: '2026-08-14' });
foundation.target.durationMinutes = 45;
foundation.target.sessionRpeMax = 6;
foundation.sections.find(s => s.role === 'SPECIFIC_PREPARATION').items.push({ exerciseId: 'prep-1', dose: {} });
foundation.sections.find(s => s.role === 'PRIMARY').items.push(
  { exerciseId: 'goblet-box-squat', method: 'CONTROLLED_RESISTANCE', dose: { sets: 2, reps: 8, rir: 4, intensity: { type: 'RIR' } } },
  { exerciseId: 'supported-row', method: 'CONTROLLED_RESISTANCE', dose: { sets: 2, reps: 8, rir: 4, intensity: { type: 'RIR' } } },
);
assert.equal(validateSessionAgainstTemplate(foundation).valid, true);
const foundationTooHeavy = structuredClone(foundation);
foundationTooHeavy.sections.find(s => s.role === 'PRIMARY').items[0].dose.rir = 1;
assert.equal(validateSessionAgainstTemplate(foundationTooHeavy).errors.some(e => e.code === 'DOSE_OUT_OF_RANGE'), true);

const lowLoadStrength = structuredClone(strength);
lowLoadStrength.sections.find(s => s.role === 'PRIMARY').items[0].dose.intensity.target = 70;
assert.equal(validateSessionAgainstTemplate(lowLoadStrength).errors.some(e => e.code === 'INTENSITY_OUT_OF_RANGE'), true);

const power = instantiateTrainingTemplate('A2', { athleteId: 'a1', date: '2026-08-14', method: 'BALLISTIC_RESISTANCE' });
power.target.durationMinutes = 50;
power.target.sessionRpeMax = 7;
power.sections.find(s => s.role === 'SPECIFIC_PREPARATION').items.push({ exerciseId: 'prep-1', dose: {} });
power.sections.find(s => s.role === 'PRIMARY').items.push({
  exerciseId: 'front-squat', method: 'BALLISTIC_RESISTANCE',
  dose: { sets: 4, reps: 5, intensity: { type: 'PERCENT_1RM', target: 60 }, intent: 'MAX_VELOCITY' },
});
assert.equal(validateSessionAgainstTemplate(power).valid, true);

const excessivePower = structuredClone(power);
excessivePower.sections.find(s => s.role === 'PRIMARY').items[0].dose = {
  sets: 5, reps: 6, intensity: { type: 'PERCENT_1RM', target: 60 }, intent: 'MAX_VELOCITY',
};
const excessiveResult = validateSessionAgainstTemplate(excessivePower);
assert.equal(excessiveResult.valid, false);
assert.equal(excessiveResult.errors.some(e => e.code === 'TOTAL_REPS_EXCEEDED'), true);

const plyometric = instantiateTrainingTemplate('A3', { athleteId: 'a1', date: '2026-08-14', method: 'PLYOMETRIC', trainingLevel: 'DEVELOPMENT' });
plyometric.target.durationMinutes = 45;
plyometric.target.sessionRpeMax = 6;
plyometric.sections.find(s => s.role === 'SPECIFIC_PREPARATION').items.push({ exerciseId: 'prep-1', dose: {} });
plyometric.sections.find(s => s.role === 'PRIMARY').items.push({
  exerciseId: 'pogo', method: 'PLYOMETRIC',
  dose: { sets: 3, reps: 5, contacts: 30, intensity: { type: 'QUALITATIVE', value: 'MODERATE' } },
});
assert.equal(validateSessionAgainstTemplate(plyometric).valid, true);
assert.equal(plyometric.sections.find(s => s.role === 'SPECIFIC_PREPARATION').rules.countsTowardMainExerciseVolume, false);
assert.equal(plyometric.sections.some(s => s.role === 'COMPLEMENTARY_STRENGTH'), true);
assert.equal(plyometric.sections.some(s => s.role === 'ACCESSORY'), true);

const noContacts = structuredClone(plyometric);
noContacts.sections.find(s => s.role === 'PRIMARY').items[0].dose.contacts = null;
assert.equal(validateSessionAgainstTemplate(noContacts).errors.some(e => e.code === 'CONTACTS_REQUIRED'), true);

const foundationPlyometric = instantiateTrainingTemplate('A3', { athleteId: 'novice', date: '2026-08-14', method: 'PLYOMETRIC', trainingLevel: 'FOUNDATION' });
foundationPlyometric.target.durationMinutes = 40;
foundationPlyometric.target.sessionRpeMax = 5;
foundationPlyometric.sections.find(s => s.role === 'SPECIFIC_PREPARATION').items.push({ exerciseId: 'prep-1', dose: {} });
foundationPlyometric.sections.find(s => s.role === 'PRIMARY').items.push({
  exerciseId: 'low-pogo', method: 'PLYOMETRIC',
  dose: { sets: 4, reps: 5, contacts: 20, intensity: { type: 'QUALITATIVE', value: 'LOW' } },
});
assert.equal(validateSessionAgainstTemplate(foundationPlyometric).valid, true);
foundationPlyometric.sections.find(s => s.role === 'PRIMARY').items[0].dose.intensity.value = 'HIGH';
assert.equal(validateSessionAgainstTemplate(foundationPlyometric).errors.some(e => e.code === 'PLYOMETRIC_INTENSITY_NOT_ALLOWED_FOR_LEVEL'), true);

const missingPrimary = structuredClone(power);
missingPrimary.sections = missingPrimary.sections.filter(s => s.role !== 'PRIMARY');
assert.equal(validateSessionAgainstTemplate(missingPrimary).errors.some(e => e.code === 'REQUIRED_SECTION_MISSING'), true);

const wrongMethod = structuredClone(power);
wrongMethod.sections.find(s => s.role === 'PRIMARY').items[0].method = 'HEAVY_RESISTANCE';
assert.equal(validateSessionAgainstTemplate(wrongMethod).errors.some(e => e.code === 'ITEM_METHOD_NOT_ALLOWED'), true);

console.log('training-templates: 24 cenários aprovados');
