# Dados e modelos — MVP

## Onde os dados vivem

- **Persistência atual:** `localStorage` chave `btperf_db_v1` (JSON único com todas as coleções). Sessão de login em `btperf_session_v1`. Navegação (tela atual) em `sessionStorage btperf_nav_v1`.
- **Seed:** gerado em `js/db.js → buildSeed()` no primeiro acesso (datas relativas a hoje — o app nunca abre "velho"). Para resetar: `localStorage.clear()` no console.
- **Futuro:** Supabase projeto `rkoqcvylamvnkxnaegna` — schema equivalente (PT-BR, prefixo `bt_`) já escrito em `supabase/001_schema_bt.sql`. A camada `db.js` é o único ponto de acesso a dados; trocar o backend não toca as telas.

## Modelos

### User
`id, name, email, password (seed, texto plano — trocar por Supabase Auth), role: TRAINER|ATHLETE, avatarInitials, athleteId?`

### Athlete
`id, trainerId, name, age, category, partnerName, status: READY|ATTENTION|INJURED|COMPETING_SOON (seed inicial; o efetivo é derivado), recoveryScore (espelho do último readiness), notes`

### PhysicalAssessment
`id, athleteId, date, generalIndex (derivado no cadastro), cmj, sprint10m, agility505, ankleMobility, notes`

### WellnessCheckin
`id, athleteId, date, sleepQuality 1–5, sleepHours, energy 1–5, musclePain 1–5, stress 1–5, painLocation, painScore 0–10, readinessScore (derivado, nunca digitado)`

### TrainingSession
`id, athleteId, date, title, type (Força|Potência|Quadra|Regenerativo), location: GYM|SAND|RECOVERY|TRAVEL, durationMinutes, targetRpe, plannedLoad, status: PLANNED|IN_PROGRESS|COMPLETED|SKIPPED, rpeFinal?, notes, exercises[]`

### Exercise (embutido na sessão)
`id, name, sets, reps, intensity, rest, order, status: PENDING|DONE`
*(a spec previa coleção separada; embutir simplificou o MVP — documentado aqui como divergência consciente)*

### Tournament
`id, name, location, startDate, endDate, level, isMainTarget, athletes[] (ids)`

### Travel
`id, tournamentId, origin, destination, departureDate, arrivalDate, hotel, notes`

### Notification
`id, userId, title, description, type (alert|warning|success|travel|info|message), read, createdAt`

### Report
`id, athleteId?, title, type (individual|equipe|mensal), createdAt, content (texto gerado dos dados no momento da criação)`

### Message
`id, senderId, receiverId, content, createdAt, read`

## Relações

- Athlete.trainerId → User · User.athleteId → Athlete
- Assessment/Checkin/Session.athleteId → Athlete
- Travel.tournamentId → Tournament · Tournament.athletes[] → Athlete
- Notification.userId → User · Message.senderId/receiverId → User

## O que é persistido × derivado × mock

| Categoria | Itens |
|---|---|
| **Persistido** | tudo acima (CRUD real em localStorage) |
| **Derivado (nunca gravado à mão)** | readiness, status efetivo do atleta, carga semanal, sequência (streak), prontidão da equipe, índice físico no cadastro de avaliação |
| **Mock/placeholder** | dispositivos conectados, Face ID, export PDF, recomendações de recovery (texto fixo contextualizado) |
