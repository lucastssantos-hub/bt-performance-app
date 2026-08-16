-- O atleta passa a preencher a própria anamnese (disponibilidade_semanal,
-- acesso_academia, acesso_areia, experiencia_forca, tolerancia_plio, objetivo)
-- no perfil dele — hoje só existia policy de SELECT (atleta_le_proprio), sem
-- UPDATE. Mesmo modelo de confiança já usado em bt_sessoes_prescritas
-- (atleta_presc_exec): RLS trava a LINHA (só a própria), o app decide quais
-- campos manda no PATCH — não há grant por coluna neste schema hoje.
create policy atleta_edita_anamnese on bt_atletas for update
  using (atleta_id = bt_meu_atleta())
  with check (atleta_id = bt_meu_atleta());
