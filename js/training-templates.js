// training-templates.js — templates científicos auditáveis de prescrição.
// O template define estrutura e limites; exercícios são resolvidos depois pelo
// catálogo. Regras D são hipóteses operacionais explícitas, não “ciência oculta”.

export const EVIDENCE_RULES = Object.freeze({
  STRENGTH_ACSM_2026: Object.freeze({
    id: 'STRENGTH_ACSM_2026',
    claim: 'Força é favorecida por cargas >=80% 1RM, múltiplas séries e prioridade no início da sessão.',
    evidenceLevel: 'B',
    population: 'HEALTHY_ADULTS',
    transfer: 'INDIRECT_TO_BEACH_TENNIS',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/41843416/',
    parameters: { percent1RmMin: 80, setsMin: 2, setsMax: 3 },
    coachOverride: true,
  }),
  POWER_ACSM_2026: Object.freeze({
    id: 'POWER_ACSM_2026',
    claim: 'Potência é favorecida por cargas moderadas, intenção concêntrica rápida e volume baixo a moderado.',
    evidenceLevel: 'B',
    population: 'HEALTHY_ADULTS',
    transfer: 'INDIRECT_TO_BEACH_TENNIS',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/41843416/',
    parameters: { percent1RmMin: 30, percent1RmMax: 70, totalRepsMax: 24, intent: 'MAX_VELOCITY' },
    coachOverride: true,
  }),
  PLYOMETRIC_ATHLETES: Object.freeze({
    id: 'PLYOMETRIC_ATHLETES',
    claim: 'Pliometria pode melhorar salto, sprint e outras qualidades; direção e unilateralidade devem refletir a tarefa.',
    evidenceLevel: 'B',
    population: 'ATHLETES',
    transfer: 'INDIRECT_TO_BEACH_TENNIS',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/40281589/',
    parameters: { trackContacts: true, taskSpecificityRequired: true },
    coachOverride: true,
  }),
  SAND_SPRINT_2026: Object.freeze({
    id: 'SAND_SPRINT_2026',
    claim: 'Treinamento em areia pode melhorar sprint, mas a exposição total específica precisa ser contabilizada.',
    evidenceLevel: 'C',
    population: 'COMPETITIVE_ATHLETES',
    transfer: 'INDIRECT_TO_BEACH_TENNIS',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/41778195/',
    parameters: { trackSandExposure: true },
    coachOverride: true,
  }),
  COMBINED_STRENGTH_PLYOMETRIC_2026: Object.freeze({
    id: 'COMBINED_STRENGTH_PLYOMETRIC_2026',
    claim: 'Combinar força e pliometria na programação melhora força, salto e sprint; a dose e a ordem devem preservar a qualidade explosiva.',
    evidenceLevel: 'B',
    population: 'HEALTHY_AND_ATHLETIC_POPULATIONS',
    transfer: 'INDIRECT_TO_BEACH_TENNIS',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/41549302/',
    parameters: { complementaryStrengthSupported: true, explosiveQualityMustBePreserved: true },
    coachOverride: true,
  }),
  EXERCISE_ORDER_2021: Object.freeze({
    id: 'EXERCISE_ORDER_2021',
    claim: 'Os maiores ganhos de força tendem a ocorrer nos exercícios colocados no início; a ordem deve refletir a prioridade da sessão.',
    evidenceLevel: 'B',
    population: 'HEALTHY_ADULTS',
    transfer: 'INDIRECT_TO_BEACH_TENNIS',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/32077380/',
    parameters: { orderBySessionPriority: true },
    coachOverride: true,
  }),
  CORE_RACKET_SPORTS_2026: Object.freeze({
    id: 'CORE_RACKET_SPORTS_2026',
    claim: 'Treinamento de tronco pode melhorar capacidades físicas relevantes em esportes de raquete, mas não define um exercício obrigatório por sessão.',
    evidenceLevel: 'C',
    population: 'RACKET_SPORT_ATHLETES',
    transfer: 'INDIRECT_TO_BEACH_TENNIS',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/41663490/',
    parameters: { weeklyProgrammingSupported: true, mandatoryEverySession: false },
    coachOverride: true,
  }),
  NOVICE_RESISTANCE_ACSM: Object.freeze({
    id: 'NOVICE_RESISTANCE_ACSM',
    claim: 'Iniciantes devem começar com cargas submáximas e faixas moderadas de repetições, contextualizadas pela capacidade e experiência.',
    evidenceLevel: 'B',
    population: 'NOVICE_HEALTHY_ADULTS',
    transfer: 'INDIRECT_TO_BEACH_TENNIS',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/11828249/',
    parameters: { oneRmTestRequired: false, legacyRecommendedRmRange: [8, 12] },
    coachOverride: true,
  }),
  NOVICE_RIR_2022: Object.freeze({
    id: 'NOVICE_RIR_2022',
    claim: 'RIR apresentou boa confiabilidade para prescrever carga em jovens novatos após familiarização.',
    evidenceLevel: 'C',
    population: 'YOUNG_NOVICE_MALES',
    transfer: 'INDIRECT_TO_GENERAL_NOVICES',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/36135029/',
    parameters: { familiarizationRequired: true, supportedRepSchemes: [3, 5, 8] },
    coachOverride: true,
  }),
  NON_FAILURE_RESISTANCE_2021: Object.freeze({
    id: 'NON_FAILURE_RESISTANCE_2021',
    claim: 'Treinar até a falha não demonstrou vantagem consistente sobre interromper a série antes da falha para força e hipertrofia.',
    evidenceLevel: 'B',
    population: 'HEALTHY_ADULTS',
    transfer: 'INDIRECT_TO_BEACH_TENNIS',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9068575/',
    parameters: { failureRequired: false },
    coachOverride: true,
  }),
  LOCAL_DOSE_HYPOTHESIS_V1: Object.freeze({
    id: 'LOCAL_DOSE_HYPOTHESIS_V1',
    claim: 'Faixas de séries e repetições herdadas do método local, pendentes de validação longitudinal no lab.',
    evidenceLevel: 'D',
    population: 'BT_PERFORMANCE_LAB',
    transfer: 'LOCAL_OPERATIONAL_HYPOTHESIS',
    sourceUrl: null,
    parameters: {},
    coachOverride: true,
  }),
});

// As faixas locais de RIR e contatos abaixo são guardrails conservadores de nível D.
// A literatura apoia progressão e monitoramento, mas não um limiar universal para Beach Tennis.
export const TRAINING_LEVEL_PROFILES = Object.freeze({
  FOUNDATION: Object.freeze({
    id: 'FOUNDATION', label: 'Iniciante / escola de movimento',
    strength: {
      loadPrescription: 'REPS_AND_RIR', oneRmTestRequired: false,
      reps: { min: 6, max: 8 }, rir: { min: 3, max: 4 }, sets: { min: 2, max: 3 },
      progressionGate: ['TECHNIQUE_STABLE', 'TARGET_REPS_COMPLETED', 'RIR_ESTIMATE_CALIBRATED'],
    },
    plyometric: {
      allowedIntensity: ['LOW'], sessionContacts: { min: 20, max: 40, evidenceLevel: 'D' },
      allowedTasks: ['LAND_AND_STICK', 'LOW_AMPLITUDE_BILATERAL', 'LOW_POGO'],
      progressionGate: ['PAIN_FREE', 'LANDING_CONTROL', 'ALIGNMENT_MAINTAINED', 'NO_TECHNIQUE_DECAY'],
    },
  }),
  DEVELOPMENT: Object.freeze({
    id: 'DEVELOPMENT', label: 'Intermediário / desenvolvimento',
    strength: {
      loadPrescription: 'REPS_AND_RIR_OR_PERCENT_1RM', oneRmTestRequired: false,
      reps: { min: 5, max: 8 }, rir: { min: 2, max: 3 }, sets: { min: 2, max: 4 },
      progressionGate: ['TECHNIQUE_STABLE', 'TARGET_REPS_COMPLETED', 'LOAD_TOLERATED'],
    },
    plyometric: {
      allowedIntensity: ['LOW', 'MODERATE'], sessionContacts: { min: 30, max: 60, evidenceLevel: 'D' },
      allowedTasks: ['BILATERAL', 'UNILATERAL_LANDING', 'LATERAL_LOW_MODERATE', 'POGO'],
      progressionGate: ['PAIN_FREE', 'LANDING_CONTROL', 'NO_TECHNIQUE_DECAY'],
    },
  }),
  PERFORMANCE: Object.freeze({
    id: 'PERFORMANCE', label: 'Avançado / performance',
    strength: {
      loadPrescription: 'PERCENT_1RM_OR_AUTOREGULATION', oneRmTestRequired: false,
      reps: { min: 2, max: 8 }, rir: { min: 1, max: 3 }, sets: { min: 2, max: 4 },
      progressionGate: ['TECHNIQUE_STABLE', 'LOAD_TOLERATED', 'READINESS_ACCEPTABLE'],
    },
    plyometric: {
      allowedIntensity: ['LOW', 'MODERATE', 'HIGH'], sessionContacts: { min: 30, max: 80, evidenceLevel: 'D' },
      allowedTasks: ['BILATERAL', 'UNILATERAL', 'MULTIPLANAR', 'REACTIVE', 'DEPTH_JUMP'],
      progressionGate: ['PAIN_FREE', 'LANDING_CONTROL', 'OUTPUT_MAINTAINED'],
    },
  }),
});

const sharedEligibility = Object.freeze({
  blockedDecisions: ['ENCAMINHAR'],
  blockedWhen: ['ACTIVE_INJURY', 'PAIN_ALTERS_MOVEMENT'],
  requiredData: ['ATHLETE', 'DATE', 'PAIN_STATUS'],
  missingDataPolicy: 'COACH_REVIEW',
});

const preparation = (durationMin, durationMax) => ({
  id: 'specific-preparation', role: 'SPECIFIC_PREPARATION', required: true, order: 1,
  objective: 'PREPARE_FOR_PRIMARY_TASK',
  budget: { durationMinutesMin: durationMin, durationMinutesMax: durationMax, exerciseCountMin: 1, exerciseCountMax: 4 },
  rules: { itemType: 'PREPARATION_DRILL', countsTowardMainExerciseVolume: false, fatiguePolicy: 'MINIMIZE', taskSpecificityRequired: true },
});

const primary = (objective, budget, rules = {}) => ({
  id: 'primary', role: 'PRIMARY', required: true, order: 2, objective,
  budget, rules,
});

const complementaryStrength = (movementPatterns, durationMax = 20, exerciseCountMax = 3) => ({
  id: 'complementary-strength', role: 'COMPLEMENTARY_STRENGTH', required: false, order: 3,
  objective: 'GENERAL_STRENGTH_SUPPORT',
  budget: { durationMinutesMax: durationMax, exerciseCountMin: 0, exerciseCountMax },
  rules: { movementPatterns, multiJointPreferred: true, mustFollowPrimary: true, mustNotCompeteWithPrimary: true },
});

const accessory = (objectives, durationMax = 12, exerciseCountMax = 3) => ({
  id: 'accessory', role: 'ACCESSORY', required: false, order: 4,
  allowedObjectives: objectives,
  budget: { durationMinutesMax: durationMax, exerciseCountMin: 0, exerciseCountMax },
  rules: { prescribedFromAssessmentOrWeeklyGap: true, isolatedExerciseAllowed: true, mustFollowPrimary: true },
});

export const TRAINING_TEMPLATES = Object.freeze({
  A0: Object.freeze({
    id: 'A0', version: '1.0.0', name: 'Escola de movimento', status: 'CANDIDATE',
    primaryObjective: 'MOVEMENT_COMPETENCY_AND_BASE_STRENGTH', environment: 'GYM',
    eligibleLevels: ['FOUNDATION'], allowedMethods: ['CONTROLLED_RESISTANCE'],
    eligibility: sharedEligibility,
    target: { durationMinutesMin: 35, durationMinutesMax: 60, sessionRpeMin: 4, sessionRpeMax: 6 },
    sections: [
      preparation(8, 15),
      primary('MOVEMENT_COMPETENCY_AND_BASE_STRENGTH', {
        durationMinutesMin: 15, durationMinutesMax: 25, exerciseCountMin: 2, exerciseCountMax: 4,
      }, {
        intensity: { type: 'RIR', min: 3, max: 4 }, sets: { min: 2, max: 3 },
        reps: { min: 6, max: 8 }, failureAllowed: false, techniqueStopRequired: true,
      }),
      complementaryStrength(['HORIZONTAL_PUSH', 'HORIZONTAL_PULL', 'KNEE_DOMINANT', 'HIP_DOMINANT'], 15, 2),
      accessory(['TRUNK_CAPACITY', 'SCAPULAR_CAPACITY'], 10, 2),
    ],
    evidenceRuleIds: ['NOVICE_RESISTANCE_ACSM', 'NOVICE_RIR_2022', 'NON_FAILURE_RESISTANCE_2021', 'LOCAL_DOSE_HYPOTHESIS_V1'],
    warnings: ['RIR_REQUIRES_FAMILIARIZATION', 'FOUNDATION_DOSE_REQUIRES_COACH_CALIBRATION'],
  }),
  A1: Object.freeze({
    id: 'A1', version: '1.0.0', name: 'Força máxima', status: 'CANDIDATE',
    primaryObjective: 'MAX_STRENGTH', environment: 'GYM',
    eligibleLevels: ['PERFORMANCE'], allowedMethods: ['HEAVY_RESISTANCE'],
    eligibility: sharedEligibility,
    target: { durationMinutesMin: 40, durationMinutesMax: 70, sessionRpeMin: 6, sessionRpeMax: 8 },
    sections: [
      preparation(8, 15),
      primary('MAX_STRENGTH', {
        durationMinutesMin: 20, durationMinutesMax: 35,
        exerciseCountMin: 1, exerciseCountMax: 2,
      }, {
        intensity: { type: 'PERCENT_1RM', min: 80, max: 95 },
        sets: { min: 2, max: 3 },
        reps: { min: 2, max: 6, evidenceLevel: 'D' },
        restSeconds: { min: 180, max: 300, evidenceLevel: 'D' },
        failureAllowed: false,
      }),
      complementaryStrength(['HORIZONTAL_PUSH', 'HORIZONTAL_PULL', 'KNEE_DOMINANT', 'HIP_DOMINANT'], 20, 3),
      accessory(['TRUNK_CAPACITY', 'SCAPULAR_CAPACITY', 'LOCAL_CAPACITY'], 12, 3),
    ],
    evidenceRuleIds: ['STRENGTH_ACSM_2026', 'NOVICE_RESISTANCE_ACSM', 'NOVICE_RIR_2022', 'NON_FAILURE_RESISTANCE_2021', 'EXERCISE_ORDER_2021', 'CORE_RACKET_SPORTS_2026', 'LOCAL_DOSE_HYPOTHESIS_V1'],
    warnings: ['REP_AND_REST_RANGES_REQUIRE_LOCAL_VALIDATION', 'ACCESSORY_SELECTION_REQUIRES_WEEKLY_CONTEXT'],
  }),

  A2: Object.freeze({
    id: 'A2', version: '1.0.0', name: 'Força-velocidade', status: 'CANDIDATE',
    primaryObjective: 'STRENGTH_SPEED', environment: 'GYM',
    eligibleLevels: ['DEVELOPMENT', 'PERFORMANCE'], allowedMethods: ['BALLISTIC_RESISTANCE', 'FAST_CONCENTRIC_RESISTANCE'],
    eligibility: sharedEligibility,
    target: { durationMinutesMin: 35, durationMinutesMax: 65, sessionRpeMin: 5, sessionRpeMax: 7 },
    sections: [
      preparation(8, 15),
      primary('STRENGTH_SPEED', {
        durationMinutesMin: 15, durationMinutesMax: 30,
        exerciseCountMin: 1, exerciseCountMax: 2, totalRepsMax: 24,
      }, {
        intensity: { type: 'PERCENT_1RM', min: 30, max: 70 },
        sets: { min: 2, max: 4, evidenceLevel: 'D' },
        reps: { min: 3, max: 5, evidenceLevel: 'D' },
        restSeconds: { min: 120, max: 180, evidenceLevel: 'D' },
        intent: 'MAX_VELOCITY', velocityLossMaxPercent: 20, failureAllowed: false,
      }),
      complementaryStrength(['HORIZONTAL_PUSH', 'HORIZONTAL_PULL', 'KNEE_DOMINANT', 'HIP_DOMINANT'], 20, 3),
      accessory(['TRUNK_CAPACITY', 'SCAPULAR_CAPACITY', 'LOCAL_CAPACITY'], 12, 3),
    ],
    evidenceRuleIds: ['POWER_ACSM_2026', 'COMBINED_STRENGTH_PLYOMETRIC_2026', 'EXERCISE_ORDER_2021', 'CORE_RACKET_SPORTS_2026', 'LOCAL_DOSE_HYPOTHESIS_V1'],
    warnings: ['SET_REP_REST_RANGES_REQUIRE_LOCAL_VALIDATION', 'ACCESSORY_SELECTION_REQUIRES_WEEKLY_CONTEXT'],
  }),

  A3: Object.freeze({
    id: 'A3', version: '1.0.0', name: 'Potência', status: 'CANDIDATE',
    primaryObjective: 'POWER', environment: 'GYM_OR_SAND',
    eligibleLevels: ['FOUNDATION', 'DEVELOPMENT', 'PERFORMANCE'], allowedMethods: ['BALLISTIC_RESISTANCE', 'PLYOMETRIC', 'ROTATIONAL_THROW'],
    eligibility: sharedEligibility,
    target: { durationMinutesMin: 30, durationMinutesMax: 60, sessionRpeMin: 4, sessionRpeMax: 7 },
    sections: [
      preparation(8, 15),
      primary('POWER', {
        durationMinutesMin: 12, durationMinutesMax: 30,
        exerciseCountMin: 1, exerciseCountMax: 2, totalRepsMax: 24,
      }, {
        doseByMethod: {
          BALLISTIC_RESISTANCE: {
            intensity: { type: 'PERCENT_1RM', min: 30, max: 70 },
            sets: { min: 2, max: 4, evidenceLevel: 'D' },
            reps: { min: 3, max: 6, evidenceLevel: 'D' },
            intent: 'MAX_VELOCITY', velocityLossMaxPercent: 20,
          },
          PLYOMETRIC: {
            intensity: { type: 'QUALITATIVE', allowed: ['LOW', 'MODERATE', 'HIGH'] },
            sets: { min: 2, max: 4, evidenceLevel: 'D' },
            reps: { min: 3, max: 6, evidenceLevel: 'D' },
            contactsRequired: true, taskSpecificityRequired: true,
          },
          ROTATIONAL_THROW: {
            intensity: { type: 'QUALITATIVE', allowed: ['MAX_INTENT'] },
            sets: { min: 2, max: 4, evidenceLevel: 'D' },
            reps: { min: 3, max: 6, evidenceLevel: 'D' },
            intent: 'MAX_VELOCITY', perSideSupported: true,
          },
        },
        failureAllowed: false,
      }),
      complementaryStrength(['HORIZONTAL_PUSH', 'HORIZONTAL_PULL', 'KNEE_DOMINANT', 'HIP_DOMINANT'], 20, 3),
      accessory(['TRUNK_CAPACITY', 'SCAPULAR_CAPACITY', 'LOCAL_CAPACITY'], 12, 3),
    ],
    evidenceRuleIds: ['POWER_ACSM_2026', 'PLYOMETRIC_ATHLETES', 'COMBINED_STRENGTH_PLYOMETRIC_2026', 'EXERCISE_ORDER_2021', 'CORE_RACKET_SPORTS_2026', 'SAND_SPRINT_2026', 'LOCAL_DOSE_HYPOTHESIS_V1'],
    warnings: ['PLYOMETRIC_CONTACT_LIMIT_REQUIRES_INDIVIDUAL_BASELINE', 'SET_REP_RANGES_REQUIRE_LOCAL_VALIDATION', 'ACCESSORY_SELECTION_REQUIRES_WEEKLY_CONTEXT'],
  }),
});

const clone = value => JSON.parse(JSON.stringify(value));
const issue = (code, path, message, meta = {}) => ({ code, path, message, ...meta });
const inRange = (value, range) => value == null || ((range.min == null || value >= range.min) && (range.max == null || value <= range.max));

export function getTrainingTemplate(id) {
  const template = TRAINING_TEMPLATES[String(id || '').toUpperCase()];
  return template ? clone(template) : null;
}

export function instantiateTrainingTemplate(id, context = {}) {
  const template = getTrainingTemplate(id);
  if (!template) throw new Error(`Template desconhecido: ${id}`);
  const requestedLevel = String(context.trainingLevel || template.eligibleLevels[0]).toUpperCase();
  if (!TRAINING_LEVEL_PROFILES[requestedLevel]) throw new Error(`Nível de treino desconhecido: ${requestedLevel}`);
  return {
    schemaVersion: '1.1', templateId: template.id, templateVersion: template.version,
    trainingLevel: requestedLevel,
    levelProfile: clone(TRAINING_LEVEL_PROFILES[requestedLevel]),
    athleteId: context.athleteId || null, date: context.date || null,
    status: 'DRAFT', source: 'ENGINE_WITH_AI_ASSIST',
    primaryObjective: template.primaryObjective, secondaryObjective: null,
    method: context.method || template.allowedMethods[0], environment: context.environment || template.environment,
    target: clone(template.target), constraints: [],
    sections: template.sections.map(section => ({ ...clone(section), items: [] })),
    evidenceRuleIds: [...template.evidenceRuleIds],
    validation: { status: 'PENDING', errors: [], warnings: [] },
    coach: { approvedBy: null, approvedAt: null, overrideReason: null },
  };
}

function validateDose(item, rules, path, errors, warnings, overrideReason) {
  const dose = item.dose || {};
  const methodRules = rules.doseByMethod ? rules.doseByMethod[item.method] : rules;
  if (!methodRules) {
    errors.push(issue('METHOD_DOSE_UNDEFINED', `${path}.method`, 'O método não possui regra de dose neste template.'));
    return;
  }
  const pushRange = (field, value, range) => {
    if (!range || inRange(value, range)) return;
    const target = range.evidenceLevel === 'D' && overrideReason ? warnings : errors;
    target.push(issue('DOSE_OUT_OF_RANGE', `${path}.dose.${field}`, `${field} fora da faixa ${range.min}–${range.max}.`, { evidenceLevel: range.evidenceLevel || 'B' }));
  };
  pushRange('sets', dose.sets, methodRules.sets);
  pushRange('reps', dose.reps, methodRules.reps);
  pushRange('rir', dose.rir, methodRules.intensity?.type === 'RIR' ? methodRules.intensity : methodRules.rir);
  const intensity = dose.intensity || {};
  if (methodRules.intensity?.type && intensity.type !== methodRules.intensity.type) {
    errors.push(issue('INTENSITY_TYPE_MISMATCH', `${path}.dose.intensity.type`, `Intensidade deve usar ${methodRules.intensity.type}.`));
  } else if (intensity.type === 'PERCENT_1RM' && !inRange(intensity.target, methodRules.intensity)) {
    errors.push(issue('INTENSITY_OUT_OF_RANGE', `${path}.dose.intensity.target`, `Intensidade fora da faixa ${methodRules.intensity.min}–${methodRules.intensity.max}% 1RM.`));
  } else if (methodRules.intensity?.allowed && !methodRules.intensity.allowed.includes(intensity.value)) {
    errors.push(issue('INTENSITY_NOT_ALLOWED', `${path}.dose.intensity.value`, 'Classificação de intensidade não permitida.'));
  }
  if (methodRules.intent && dose.intent !== methodRules.intent) {
    errors.push(issue('INTENT_REQUIRED', `${path}.dose.intent`, `O método exige intenção ${methodRules.intent}.`));
  }
  if (methodRules.contactsRequired && !(Number(dose.contacts) > 0)) {
    errors.push(issue('CONTACTS_REQUIRED', `${path}.dose.contacts`, 'Pliometria exige contagem de contatos.'));
  }
}

export function validateSessionAgainstTemplate(session) {
  const template = TRAINING_TEMPLATES[session?.templateId];
  const errors = [];
  const warnings = [];
  if (!template) return { valid: false, status: 'REJECTED', errors: [issue('UNKNOWN_TEMPLATE', 'templateId', 'Template inexistente.')], warnings };
  if (!template.eligibleLevels.includes(session.trainingLevel)) errors.push(issue('TRAINING_LEVEL_NOT_ELIGIBLE', 'trainingLevel', `O nível ${session.trainingLevel} não é elegível para o template ${template.id}.`));
  if (session.primaryObjective !== template.primaryObjective) errors.push(issue('PRIMARY_OBJECTIVE_MISMATCH', 'primaryObjective', 'Objetivo primário incompatível com o template.'));
  if (!template.allowedMethods.includes(session.method)) errors.push(issue('METHOD_NOT_ALLOWED', 'method', 'Método não permitido pelo template.'));
  if (!inRange(session.target?.durationMinutes, { min: template.target.durationMinutesMin, max: template.target.durationMinutesMax })) {
    errors.push(issue('DURATION_OUT_OF_RANGE', 'target.durationMinutes', 'Duração fora da faixa do template.'));
  }
  if (!inRange(session.target?.sessionRpeMax, { min: template.target.sessionRpeMin, max: template.target.sessionRpeMax })) {
    errors.push(issue('RPE_OUT_OF_RANGE', 'target.sessionRpeMax', 'PSE alvo fora da faixa do template.'));
  }

  const sections = session.sections || [];
  template.sections.filter(s => s.required).forEach(required => {
    if (!sections.some(section => section.role === required.role)) errors.push(issue('REQUIRED_SECTION_MISSING', 'sections', `Seção ${required.role} ausente.`));
  });
  const primarySections = sections.filter(section => section.role === 'PRIMARY');
  if (primarySections.length !== 1) errors.push(issue('PRIMARY_SECTION_COUNT', 'sections', 'A sessão deve possuir exatamente uma seção PRIMARY.'));

  sections.forEach((section, sectionIndex) => {
    const definition = template.sections.find(candidate => candidate.role === section.role);
    const path = `sections.${sectionIndex}`;
    if (!definition) { errors.push(issue('SECTION_NOT_ALLOWED', path, `Seção ${section.role} não permitida.`)); return; }
    const items = section.items || [];
    const budget = definition.budget || {};
    if (!inRange(items.length, { min: budget.exerciseCountMin, max: budget.exerciseCountMax })) {
      errors.push(issue('EXERCISE_COUNT_OUT_OF_RANGE', `${path}.items`, 'Quantidade de exercícios fora da faixa da seção.'));
    }
    const totalReps = items.reduce((total, item) => total + (Number(item.dose?.sets) || 0) * (Number(item.dose?.reps) || 0), 0);
    if (budget.totalRepsMax != null && totalReps > budget.totalRepsMax) {
      errors.push(issue('TOTAL_REPS_EXCEEDED', `${path}.items`, `Volume de ${totalReps} repetições excede o máximo ${budget.totalRepsMax}.`));
    }
    if (section.role === 'PRIMARY') items.forEach((item, itemIndex) => {
      const itemPath = `${path}.items.${itemIndex}`;
      if (!template.allowedMethods.includes(item.method)) {
        errors.push(issue('ITEM_METHOD_NOT_ALLOWED', `${itemPath}.method`, 'Método do exercício não permitido pelo template.'));
        return;
      }
      validateDose(item, definition.rules || {}, itemPath, errors, warnings, session.coach?.overrideReason);
    });
  });

  const levelProfile = TRAINING_LEVEL_PROFILES[session.trainingLevel];
  const plyometricItems = sections.flatMap((section, sectionIndex) =>
    (section.items || []).map((item, itemIndex) => ({ item, path: `sections.${sectionIndex}.items.${itemIndex}` }))
  ).filter(({ item }) => item.method === 'PLYOMETRIC');
  if (levelProfile && plyometricItems.length) {
    const allowed = levelProfile.plyometric.allowedIntensity;
    plyometricItems.forEach(({ item, path }) => {
      const intensity = item.dose?.intensity?.value;
      if (!allowed.includes(intensity)) errors.push(issue('PLYOMETRIC_INTENSITY_NOT_ALLOWED_FOR_LEVEL', `${path}.dose.intensity.value`, `Intensidade ${intensity} não permitida para ${session.trainingLevel}.`));
    });
    const totalContacts = plyometricItems.reduce((total, { item }) => total + (Number(item.dose?.contacts) || 0), 0);
    if (!inRange(totalContacts, levelProfile.plyometric.sessionContacts)) {
      const target = session.coach?.overrideReason ? warnings : errors;
      target.push(issue('PLYOMETRIC_SESSION_CONTACTS_OUT_OF_LEVEL_RANGE', 'sections', `Total de ${totalContacts} contatos fora da faixa operacional ${levelProfile.plyometric.sessionContacts.min}–${levelProfile.plyometric.sessionContacts.max} para ${session.trainingLevel}.`, { evidenceLevel: 'D' }));
    }
  }

  template.warnings.forEach(code => warnings.push(issue(code, 'template', 'Regra operacional requer validação local.', { evidenceLevel: 'D' })));
  return { valid: errors.length === 0, status: errors.length ? 'REJECTED' : warnings.length ? 'REVIEW_REQUIRED' : 'APPROVED', errors, warnings };
}
