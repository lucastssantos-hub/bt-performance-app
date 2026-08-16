-- Reflete a decisão de 2026-08-15 (docs/TEMPLATES_PRESCRICAO_V1.md, lab):
-- A6 (Prevenção, rótulo genérico) divide em A6A (controle de tronco) e A6B
-- (familiarização de padrões básicos). A4/A5/B1-B4/B6/B7 continuam iguais;
-- B5 funde em B2 na camada de aplicação e não precisa de mudança de schema
-- (nenhuma linha nova referencia B5; a antiga permanece só como histórico).

-- 1) o check constraint de codigo foi criado inline (sem nome fixo no schema
--    original) — encontra e remove o que existir sobre a coluna, não assume nome.
do $$
declare
  con_name text;
begin
  select con.conname into con_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'bt_biblioteca_sessoes'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%codigo%';
  if con_name is not null then
    execute format('alter table bt_biblioteca_sessoes drop constraint %I', con_name);
  end if;
end $$;

alter table bt_biblioteca_sessoes add constraint bt_biblioteca_sessoes_codigo_check
  check (codigo in ('A1','A2','A3','A4','A5','A6','A6A','A6B','B1','B2','B3','B4','B5','B6','B7'));

-- 2) as duas sessões novas (doses de docs/TEMPLATES_PRESCRICAO_V1.md §3.11/§3.12,
-- já cruzadas com motor-prescricao.md). A6 original fica na tabela como
-- histórico (nada mais referencia ela; o app não gera código A6 solto).
insert into bt_biblioteca_sessoes (codigo, nome, ambiente, objetivo, quando_usar, quando_nao_usar, faixas) values
('A6A','Controle de tronco','academia','Melhorar estabilidade proximal e controle de tronco com baixa demanda articular','Baixa estabilidade proximal identificada em avaliação; complemento de sessão de força/potência; início de ciclo; é a opção segura em bloqueio clínico (dor >=6, prontidão vermelha, viagem longa)','Dor aguda; lesão ativa sem liberação; usado como desculpa para evitar a força necessária','{"series":"2-3","repeticoes":"6-10","intensidade":"baixa a moderada, sem perda relevante de técnica","descanso":"60-120s","fadiga_esperada":"baixa"}'),
('A6B','Familiarização de padrões básicos','academia','Familiarizar o atleta com um padrão básico de força antes de progredir para dose plena','Início de ciclo; retorno de dor leve já liberado por profissional; atleta sem familiarização prévia com o padrão','Dor aguda; lesão ativa sem liberação; atleta que já domina o padrão — nesse caso usar A1/A2/A3 diretamente','{"series":"2-3","repeticoes":"6-10","intensidade":"carga leve, foco total em técnica e amplitude","descanso":"60-120s","fadiga_esperada":"baixa"}')
on conflict (codigo) do nothing;
